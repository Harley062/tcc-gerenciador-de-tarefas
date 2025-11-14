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
import { useTaskStore, Task } from '../store/taskStore';
import TaskCard from './TaskCard';
import TaskEditModal from './TaskEditModal';

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
        return 'text-warning-700 dark:text-warning-300';
      case 'in_progress':
        return 'text-primary-700 dark:text-primary-300';
      case 'done':
        return 'text-success-700 dark:text-success-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-4 ${colorClass} ${
        isOver ? 'ring-4 ring-primary-400 dark:ring-primary-600 scale-105' : ''
      } transition-all duration-200 shadow-soft`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={getHeaderColor()}>
            {getColumnIcon()}
          </div>
          <h2 className={`text-lg font-bold ${getHeaderColor()}`}>
            {title}
          </h2>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getHeaderColor()} bg-white/50 dark:bg-gray-800/50`}>
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-[400px] space-y-3">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-600 text-sm">
              <p>Arraste tarefas aqui</p>
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
      todo: tasks.filter((t) => t.status === 'todo'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      done: tasks.filter((t) => t.status === 'done'),
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

    // Find which column the task is being dropped into
    let newStatus: Task['status'] | null = null;

    // Check if dropped directly on a column or on another task
    if (overId === 'todo' || overId === 'in_progress' || overId === 'done') {
      newStatus = overId as Task['status'];
    } else {
      // Find the status of the task we're dropping on
      for (const [status, columnTasks] of Object.entries(columns)) {
        if (columnTasks.some(t => t.id === overId)) {
          newStatus = status as Task['status'];
          break;
        }
      }
    }

    if (!newStatus) return;

    // Find the current status of the dragged task
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
    // show a simple DOM modal instead of window.confirm
    const confirmed = await new Promise<boolean>((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50';
      const modal = document.createElement('div');
      modal.className = 'bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-lg';

      modal.innerHTML = `
      <h3 class="text-lg font-bold mb-2">Confirmar exclusão</h3>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Tem certeza que deseja deletar esta tarefa?</p>
      `;

      const buttons = document.createElement('div');
      buttons.className = 'flex justify-end gap-2';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'px-3 py-1 rounded bg-gray-200 dark:bg-gray-700';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
      };

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'px-3 py-1 rounded bg-red-600 text-white';
      confirmBtn.textContent = 'Deletar';
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
    todo: 'bg-gradient-to-b from-warning-50 to-warning-100/50 dark:from-warning-900/10 dark:to-warning-800/5 border-2 border-warning-200 dark:border-warning-800',
    in_progress: 'bg-gradient-to-b from-primary-50 to-primary-100/50 dark:from-primary-900/10 dark:to-primary-800/5 border-2 border-primary-200 dark:border-primary-800',
    done: 'bg-gradient-to-b from-success-50 to-success-100/50 dark:from-success-900/10 dark:to-success-800/5 border-2 border-success-200 dark:border-success-800',
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400"></div>
        <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Carregando tarefas...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-gradient-primary mb-2">Quadro Kanban</h1>
        <p className="text-gray-600 dark:text-gray-400">Arraste e solte as tarefas para alterar o status</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <div className="opacity-80">
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
    </div>
  );
};

export default KanbanView;
