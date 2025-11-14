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

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg p-4 ${colorClass} ${isOver ? 'ring-2 ring-blue-400' : ''}`}
    >
      <h2 className="text-lg font-semibold mb-4 text-gray-800">
        {title} ({tasks.length})
      </h2>

      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-[200px]">
          {tasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
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
    if (window.confirm('Tem certeza que deseja deletar esta tarefa?')) {
      try {
        await deleteTask(taskId);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const columnTitles = {
    todo: 'A Fazer',
    in_progress: 'Em Progresso',
    done: 'Concluído',
  };

  const columnColors = {
    todo: 'bg-gray-100',
    in_progress: 'bg-yellow-50',
    done: 'bg-green-50',
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600">Carregando tarefas...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Quadro Kanban</h1>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
