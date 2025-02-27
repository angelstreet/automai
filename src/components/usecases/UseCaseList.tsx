import { UseCase } from '@/types/usecase';
import { Button } from '@/components/ui/button';

type UseCaseListProps = {
  usecases: UseCase[];
  favorites: Set<string>;
  selectedUseCases: Set<string>;
  isSelectionMode: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: (id: string) => void;
  onEdit: (useCase: UseCase) => void;
  sortConfig: { key: string; direction: string };
  onSort: (key: string) => void;
};

export function UseCaseList({
  usecases,
  favorites,
  selectedUseCases,
  isSelectionMode,
  onToggleFavorite,
  onSelect,
  onEdit,
  sortConfig,
  onSort,
}: UseCaseListProps) {
  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-4 font-semibold">
        <button onClick={() => onSort('shortId')}>ID {getSortIcon('shortId')}</button>
        <button onClick={() => onSort('name')}>Name {getSortIcon('name')}</button>
        <button onClick={() => onSort('steps.platform')}>
          Platform {getSortIcon('steps.platform')}
        </button>
        <button onClick={() => onSort('createdAt')}>Created {getSortIcon('createdAt')}</button>
        <button onClick={() => onSort('lastModified')}>
          Modified {getSortIcon('lastModified')}
        </button>
        <div>Actions</div>
      </div>

      {usecases.map((useCase) => (
        <div
          key={useCase.id}
          className={`grid grid-cols-6 gap-4 p-2 rounded ${
            selectedUseCases.has(useCase.id) ? 'bg-secondary' : ''
          }`}
          onClick={() => isSelectionMode && onSelect(useCase.id)}
        >
          <div>{useCase.shortId}</div>
          <div>{useCase.name}</div>
          <div>{useCase.steps.platform}</div>
          <div>{new Date(useCase.createdAt).toLocaleDateString()}</div>
          <div>
            {useCase.lastModified ? new Date(useCase.lastModified).toLocaleDateString() : '-'}
          </div>
          <div className="space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(useCase.id);
              }}
            >
              {favorites.has(useCase.id) ? '★' : '☆'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(useCase);
              }}
            >
              Edit
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
