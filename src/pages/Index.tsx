import { KanbanBoard } from "@/components/KanbanBoard";
import { MadeWithDyad } from "@/components/made-with-dyad";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow-md">
        <h1 className="text-2xl font-bold text-center">Quadro Kanban</h1>
      </header>
      <main>
        <KanbanBoard />
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Index;