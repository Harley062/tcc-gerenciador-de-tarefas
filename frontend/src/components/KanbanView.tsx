import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useTaskStore, Task } from '../store/taskStore';
import TaskCard from './TaskCard';

const KanbanView: React.FC = () => {
  const { tasks, fetchTasks, updateTask, deleteTask, isLoading } = useTaskStore();
  const [columns, setColumns] = useState<Record<string, Task[]>>({
    todo: [],
    in_progress: [],
    done: [],
  });

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

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const newStatus = destination.droppableId as Task['status'];
    
    try {
      await updateTask(draggableId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
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
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(columns).map(([columnId, columnTasks]) => (
            <div key={columnId} className={`rounded-lg p-4 ${columnColors[columnId as keyof typeof columnColors]}`}>
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                {columnTitles[columnId as keyof typeof columnTitles]} ({columnTasks.length})
              </h2>
              
              <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[200px] ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={provided.draggableProps.style}
                            className={`mb-3 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                          >
                            <TaskCard
                              task={task}
                              onDelete={handleDelete}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanView;
