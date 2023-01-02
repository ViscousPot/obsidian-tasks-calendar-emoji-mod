import type { Task } from '../../Task';
import type { Comparator } from '../Sorter';
import { FilterInstructionsBasedField } from './FilterInstructionsBasedField';

export class StatusField extends FilterInstructionsBasedField {
    constructor() {
        super();

        // Backwards-compatibility note: In Tasks 1.22.0 and earlier, all tasks
        // with any status character except space were considered to be done
        // by the status filter instructions.
        this._filters.add('done', (task: Task) => task.status.indicator !== ' ');
        this._filters.add('not done', (task: Task) => task.status.indicator === ' ');
    }

    public fieldName(): string {
        return 'status';
    }

    public supportsSorting(): boolean {
        return true;
    }

    /**
     * Return a function to compare two Task objects, for use in sorting by status.
     */
    public comparator(): Comparator {
        return (a: Task, b: Task) => {
            if (a.status.name < b.status.name) {
                return 1;
            } else if (a.status.name > b.status.name) {
                return -1;
            } else {
                return 0;
            }
        };
    }
}
