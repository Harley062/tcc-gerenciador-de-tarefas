import React, { useEffect, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTaskStore, Task, isStatusTodo, isStatusInProgress, isStatusDone } from '../store/taskStore';
import TaskCard from './TaskCard';
import TaskEditModal from './TaskEditModal';
import TaskCreateModal from './TaskCreateModal';

interface SortableTaskProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const SortableTask: React.FC<SortableTaskProps> = ({ task, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3"
    >
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
};

interface DroppableColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  colorClass: string;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({
  id,
  title,
  tasks,
  colorClass,
  onEdit,
  onDelete
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  const getColumnIcon = () => {
    switch(id) {
      case 'todo':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        );
      case 'in_progress':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'done':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getHeaderColor = () => {
    switch(id) {
      case 'todo':
        return 'text-gray-700 dark:text-gray-200';
      case 'in_progress':
        return 'text-blue-700 dark:text-blue-200';
      case 'done':
        return 'text-green-700 dark:text-green-200';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`w-[350px] max-w-[350px] flex-shrink-0 rounded-3xl p-5 ${colorClass} ${
        isOver ? 'ring-4 ring-primary-400/50 dark:ring-primary-600/50 scale-[1.02] shadow-2xl' : 'shadow-xl'
      } transition-all duration-300 backdrop-blur-xl flex flex-col h-full max-h-[calc(100vh-12rem)] border border-white/20 dark:border-gray-700/30`}
    >
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-sm backdrop-blur-sm ${getHeaderColor()}`}>
            {getColumnIcon()}
          </div>
          <h2 className={`text-xl font-bold tracking-tight ${getHeaderColor()}`}>
            {title}
          </h2>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getHeaderColor()} bg-white/60 dark:bg-gray-800/60 shadow-sm backdrop-blur-sm`}>
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 min-h-[150px] pb-4">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-300/50 dark:border-gray-700/50 rounded-2xl bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm transition-colors hover:bg-white/30 dark:hover:bg-gray-800/30">
              <div className="p-3 bg-white/30 dark:bg-gray-800/30 rounded-full mb-3">
                <svg className="w-8 h-8 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm font-bold opacity-80">Sem tarefas</p>
              <p className="text-xs opacity-60 mt-1">Arraste itens para cá</p>
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTask
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
};

const KanbanView: React.FC = () => {
  const { tasks, fetchTasks, updateTask, deleteTask, isLoading } = useTaskStore();
  const [columns, setColumns] = useState<Record<string, Task[]>>({
    todo: [],
    in_progress: [],
    done: [],
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchTasks({});
  }, [fetchTasks]);

  useEffect(() => {
    const newColumns = {
      todo: tasks.filter((t) => isStatusTodo(t.status)),
      in_progress: tasks.filter((t) => isStatusInProgress(t.status)),
      done: tasks.filter((t) => isStatusDone(t.status)),
    };
    setColumns(newColumns);
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    let newStatus: Task['status'] | null = null;

    if (overId === 'todo' || overId === 'in_progress' || overId === 'done') {
      newStatus = overId as Task['status'];
    } else {
      for (const [status, columnTasks] of Object.entries(columns)) {
        if (columnTasks.some(t => t.id === overId)) {
          newStatus = status as Task['status'];
          break;
        }
      }
    }

    if (!newStatus) return;

    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask || currentTask.status === newStatus) return;

    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDelete = async (taskId: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in';
      const modal = document.createElement('div');
      modal.className = 'bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl transform scale-100 animate-scale-in border border-gray-200 dark:border-gray-700';

      modal.innerHTML = `
      <div class="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
        <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Confirmar exclusão</h3>
      </div>
      <p class="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">Tem certeza que deseja deletar esta tarefa? Esta ação não pode ser desfeita.</p>
      `;

      const buttons = document.createElement('div');
      buttons.className = 'flex justify-end gap-3';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
      };

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 transition-all';
      confirmBtn.textContent = 'Sim, deletar';
      confirmBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
      };

      buttons.appendChild(cancelBtn);
      buttons.appendChild(confirmBtn);
      modal.appendChild(buttons);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      confirmBtn.focus();
    });

    if (!confirmed) return;
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const columnTitles = {
    todo: 'A Fazer',
    in_progress: 'Em Progresso',
    done: 'Concluído',
  };

  const columnColors = {
    todo: 'bg-gray-100/80 dark:bg-gray-900/40',
    in_progress: 'bg-blue-50/80 dark:bg-blue-900/20',
    done: 'bg-green-50/80 dark:bg-green-900/20',
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative w-20 h-20">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-primary-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium animate-pulse">Carregando seu quadro...</p>
      </div>
    );
  }

  return (
    <div className="w-full transition-colors duration-300">
      <div className="w-full max-w-[1800px] mx-auto p-4 sm:p-8 animate-fade-in">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
              Quadro <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600 dark:from-primary-400 dark:to-purple-400">Kanban</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Gerencie o fluxo das suas tarefas visualmente</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white rounded-2xl transition-all duration-300 font-bold shadow-lg hover:shadow-primary-500/40 flex items-center gap-2 active:scale-95 transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Nova Tarefa</span>
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-6 items-start pb-4 overflow-x-auto min-h-[calc(100vh-16rem)] px-2">
            {Object.entries(columns).map(([columnId, columnTasks]) => (
              <DroppableColumn
                key={columnId}
                id={columnId}
                title={columnTitles[columnId as keyof typeof columnTitles]}
                tasks={columnTasks}
                colorClass={columnColors[columnId as keyof typeof columnColors]}
                onEdit={(task) => setSelectedTaskForEdit(task)}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="opacity-90 rotate-2 scale-105 cursor-grabbing">
                <TaskCard task={activeTask} onDelete={handleDelete} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {selectedTaskForEdit && (
          <TaskEditModal
            task={selectedTaskForEdit}
            onClose={() => setSelectedTaskForEdit(null)}
            onSaved={() => fetchTasks({})}
          />
        )}

        {showCreateModal && (
          <TaskCreateModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              fetchTasks({});
            }}
          />
        )}
      </div>
    </div>
  );
};

export default KanbanView;
