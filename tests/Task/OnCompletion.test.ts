/**
 * @jest-environment jsdom
 */
import moment from 'moment';
import { verifyAll } from 'approvals/lib/Providers/Jest/JestApprovals';
import { Status } from '../../src/Statuses/Status';
import { StatusConfiguration, StatusType } from '../../src/Statuses/StatusConfiguration';
import { fromLine, toLines, toMarkdown } from '../TestingTools/TestHelpers';
import type { Task } from '../../src/Task/Task';
import { handleOnCompletion } from '../../src/Task/OnCompletion';

window.moment = moment;

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-02-11'));
});

afterEach(() => {
    jest.useRealTimers();
    // resetSettings();
});

export function applyStatusAndOnCompletionAction(task: Task, newStatus: Status) {
    const tasks = task.handleNewStatus(newStatus);
    return handleOnCompletion(task, tasks);
}

function makeTask(line: string) {
    return fromLine({ line });
}

describe('OnCompletion feature', () => {
    it('should not delete an already-done task', () => {
        // Arrange
        const line = '- [x] An already-DONE, non-recurring task 🏁 delete ✅ 2024-02-10';
        const task = makeTask(line);

        // Act
        const returnedTasks = applyStatusAndOnCompletionAction(task, Status.makeDone());

        // Assert
        expect(returnedTasks.length).toEqual(1);
        expect(returnedTasks[0].originalMarkdown).toEqual(line);
    });

    it('should just return trigger-less, non-recurring task', () => {
        // Arrange
        const task = makeTask('- [ ] A non-recurring task with no trigger 📅 2024-02-10');
        expect(task.status.type).toEqual(StatusType.TODO);

        // Act
        const tasks = applyStatusAndOnCompletionAction(task, Status.makeDone());

        // Assert
        expect(tasks.length).toEqual(1);
        expect(toLines(tasks).join('\n')).toMatchInlineSnapshot(
            '"- [x] A non-recurring task with no trigger 📅 2024-02-10 ✅ 2024-02-11"',
        );
    });

    it('should just return trigger-less recurring task', () => {
        // Arrange
        const task = makeTask('- [ ] A recurring task with no trigger 🔁 every day 📅 2024-02-10');
        expect(task.status.type).toEqual(StatusType.TODO);

        // Act
        const tasks = applyStatusAndOnCompletionAction(task, Status.makeDone());

        // Assert
        expect(tasks.length).toEqual(2);
        expect(toLines(tasks).join('\n')).toMatchInlineSnapshot(`
            "- [ ] A recurring task with no trigger 🔁 every day 📅 2024-02-11
            - [x] A recurring task with no trigger 🔁 every day 📅 2024-02-10 ✅ 2024-02-11"
        `);
    });

    it('should return the task when going from TODO to IN_PROGRESS', () => {
        // Arrange
        const task = makeTask('- [ ] A recurring task with OC_DELETE trigger 🔁 every day 🏁 delete 📅 2024-02-10');

        // Act
        const tasks = applyStatusAndOnCompletionAction(task, Status.makeInProgress());

        // Assert
        expect(tasks.length).toEqual(1);
        expect(tasks[0].status.type).toEqual(StatusType.IN_PROGRESS);
    });

    it('should return the task when going from one DONE status to another DONE status', () => {
        // Arrange
        const done2 = new Status(new StatusConfiguration('X', 'DONE', ' ', true, StatusType.DONE));
        const task = makeTask('- [x] A simple done task with 🏁 delete');

        // Act
        const tasks = applyStatusAndOnCompletionAction(task, done2);

        // Assert
        expect(tasks.length).toEqual(1);
        expect(tasks[0].status.symbol).toEqual('X');
        expect(tasks[0].status.type).toEqual(StatusType.DONE);
    });

    it('should return a task featuring the On Completion flag trigger but an empty string Action', () => {
        // Arrange
        const task = makeTask('- [ ] A non-recurring task with');

        // Act
        const tasks = applyStatusAndOnCompletionAction(task, Status.makeDone());

        // Assert
        expect(tasks.length).toEqual(1);
    });
});

describe('OnCompletion - Delete action', () => {
    it('should discard a non-recurring task with "delete" Action upon completion', () => {
        // Arrange
        const task = makeTask('- [ ] A non-recurring task with OC_DELETE trigger 🏁 delete 📅 2024-02-10');
        expect(task.status.type).toEqual(StatusType.TODO);

        // Act
        const tasks = applyStatusAndOnCompletionAction(task, Status.makeDone());

        // Assert
        expect(tasks).toEqual([]);
    });

    it('should retain only the next instance of a recurring task with "delete" Action upon completion', () => {
        // Arrange
        const task = makeTask('- [ ] A recurring task with OC_DELETE trigger 🔁 every day 🏁 delete 📅 2024-02-10');
        expect(task.status.type).toEqual(StatusType.TODO);

        // Act
        const tasks = applyStatusAndOnCompletionAction(task, Status.makeDone());

        // Assert
        expect(tasks.length).toEqual(1);
        expect(toLines(tasks).join('\n')).toMatchInlineSnapshot(
            '"- [ ] A recurring task with OC_DELETE trigger 🔁 every day 🏁 delete 📅 2024-02-11"',
        );
    });

    it('should delete a simple task with "delete" Action upon completion', () => {
        // Arrange
        const task = makeTask('- [ ] A non-recurring task with OC_DELETE trigger 🏁 delete');

        // Act
        const tasks = applyStatusAndOnCompletionAction(task, Status.makeDone());

        // Assert
        expect(tasks.length).toEqual(0);
    });
});

type ToggleCase = {
    // inputs:
    nextStatus: Status;
    line: string;
};

function getCases(): ToggleCase[] {
    return [
        // Non-recurring
        {
            nextStatus: Status.makeDone(),
            line: '- [ ] A non-recurring task with no trigger 📅 2024-02-10',
        },

        {
            nextStatus: Status.makeDone(),
            line: '- [ ] A non-recurring task with 🏁 delete',
        },

        {
            nextStatus: Status.makeDone(),
            line: '- [ ] A non-recurring task with 🏁 delete 📅 2024-02-10',
        },

        {
            nextStatus: Status.makeDone(),
            line: '- [ ] A non-recurring task with invalid OC trigger 🏁 INVALID_ACTION 📅 2024-02-10',
        },

        {
            nextStatus: Status.makeDone(),
            line: '- [ ] A non-recurring task with 🏁',
        },

        // Recurring

        {
            nextStatus: Status.makeDone(),
            line: '- [ ] A recurring task with no trigger 🔁 every day 📅 2024-02-10',
        },

        {
            nextStatus: Status.makeDone(),
            line: '- [ ] A recurring task with 🏁 delete 🔁 every day 📅 2024-02-10',
        },

        {
            nextStatus: Status.makeInProgress(),
            line: '- [ ] A recurring task with 🏁 delete 🔁 every day 📅 2024-02-10',
        },

        // Other

        {
            nextStatus: Status.makeDone(),
            line: '- [x] An already-DONE task, changing to Same      DONE status 🏁 delete 📅 2024-02-10 ✅ 2024-02-10',
        },

        {
            nextStatus: new Status(new StatusConfiguration('X', 'new status', ' ', false, StatusType.DONE)),
            line: '- [x] An already-DONE task, changing to Different DONE status 🏁 delete 📅 2024-02-10 ✅ 2024-02-10',
        },

        // Indented, within callout/code block

        {
            nextStatus: Status.makeDone(),
            line: '    - [ ] An indented task with 🏁 delete',
        },

        {
            nextStatus: Status.makeDone(),
            line: '> - [ ] A task within a block quote or callout and 🏁 delete',
        },
    ];
}

function action(toggleCase: ToggleCase): string {
    const newStatus = toggleCase.nextStatus;
    const task = fromLine({ line: toggleCase.line, path: 'anything.md', precedingHeader: 'heading' });
    const step1 = task.handleNewStatus(newStatus);
    const step2 = applyStatusAndOnCompletionAction(task, newStatus);
    return `
initial task:
${task.toFileLineString()}

=> advances to status [${newStatus.symbol}] and type ${newStatus.type}:
${toMarkdown(step1)}

=> which, after any on-completion action, results in:
${toMarkdown(step2)}
----------------------------------------------
`;
}

describe('visualise completion-behaviour', () => {
    it('visualise', () => {
        // List of status and task
        const cases = getCases();
        verifyAll('checking on completion', cases, (toggleCase) => action(toggleCase));
    });
});
