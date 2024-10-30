import { Authenticated, BodySchema, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import {
  deleteTaskAssignments,
  deleteTaskLinks,
  getTask,
  getTaskAssignments,
  getTaskLinks,
  getTasksPage,
  insertTask,
  insertTaskAssignments,
  insertTaskLinks,
  Task,
  TaskAssignment,
  TaskLinks,
  updateTask,
} from '../../services/tasks/queries.js';
import { DateTime } from '../../services/gql/queries/generated/schema.js';
import { Session } from '@shopify/shopify-api';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { Request, Response } from 'express-serve-static-core';
import { UpsertTask } from '../../schemas/generated/upsert-task.js';
import { TaskPaginationOptions } from '../../schemas/generated/task-pagination-options.js';
import { unit } from '../../services/db/unit-of-work.js';

// TODO: Restrict task permissions -> only mark as done if assigned etc

@Authenticated()
export default class TasksController {
  @Get('/')
  @QuerySchema('task-pagination-options')
  async getTasks(req: Request<unknown, unknown, unknown, TaskPaginationOptions>, res: Response<GetTasksResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const { tasks, hasNextPage } = await getTasksPage(shop, paginationOptions);

    const taskIds = tasks.map(task => task.id);
    const [assignments, links] = await Promise.all([getTaskAssignments(taskIds), getTaskLinks(taskIds)]);

    return res.json({
      tasks: tasks.map(task => mapTask(task, assignments, links)),
      hasNextPage,
    });
  }

  @Get('/:id')
  async getTask(req: Request<{ id: string }>, res: Response<GetTaskResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { id } = req.params;

    const [task, assignments, links] = await Promise.all([
      getTask({ shop, id: Number(id) }),
      getTaskAssignments([Number(id)]),
      getTaskLinks([Number(id)]),
    ]);

    if (!task) {
      throw new HttpError('Task not found', 404);
    }

    return res.json(mapTask(task, assignments, links));
  }

  @Post('/')
  @BodySchema('upsert-task')
  async createTask(req: Request<unknown, unknown, UpsertTask>, res: Response<GetTaskResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { name, description, estimatedTimeMinutes, deadline, done, staffMemberIds, links } = req.body;

    return await unit(async () => {
      const task = await insertTask({
        shop,
        name,
        description,
        estimatedTimeMinutes,
        deadline: deadline ? new Date(deadline) : null,
        done,
      });

      await Promise.all([
        await insertTaskAssignments(task.id, staffMemberIds),
        await insertTaskLinks(task.id, shop, links),
      ]);

      return res.json(
        mapTask(
          task,
          staffMemberIds.map(staffMemberId => ({ taskId: task.id, staffMemberId })),
          [{ id: task.id, links }],
        ),
      );
    });
  }

  @Post('/:id')
  @BodySchema('upsert-task')
  async postTask(req: Request<{ id: string }, unknown, UpsertTask>, res: Response<GetTaskResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { id } = req.params;
    const { name, description, estimatedTimeMinutes, deadline, done, staffMemberIds, links } = req.body;

    return await unit(async () => {
      const [task] = await Promise.all([
        updateTask({
          id: Number(id),
          shop,
          name,
          description,
          estimatedTimeMinutes,
          deadline: deadline ? new Date(deadline) : null,
          done,
        }),
        deleteTaskAssignments({ taskId: Number(id) }).then(() => insertTaskAssignments(Number(id), staffMemberIds)),
        deleteTaskLinks(Number(id)).then(() => insertTaskLinks(Number(id), shop, links)),
      ]);

      return res.json(
        mapTask(
          task,
          staffMemberIds.map(staffMemberId => ({ taskId: task.id, staffMemberId })),
          [{ id: task.id, links }],
        ),
      );
    });
  }
}

export function mapTask(task: Task, assignments: Pick<TaskAssignment, 'taskId' | 'staffMemberId'>[], links: TaskLinks) {
  return {
    ...task,
    deadline: task.deadline ? (task.deadline.toISOString() as DateTime) : null,
    createdAt: task.createdAt.toISOString() as DateTime,
    updatedAt: task.updatedAt.toISOString() as DateTime,
    staffMemberIds: assignments
      .filter(assignment => assignment.taskId === task.id)
      .map(assignment => assignment.staffMemberId),
    links:
      links.find(links => links.id === task.id)?.links ??
      ({
        workOrders: [],
        purchaseOrders: [],
        specialOrders: [],
        transferOrders: [],
        cycleCounts: [],
        serials: [],
      } satisfies TaskLinks[number]['links']),
  };
}

export type TaskResponse = ReturnType<typeof mapTask>;

export type GetTaskResponse = TaskResponse;

export type GetTasksResponse = {
  tasks: TaskResponse[];
  hasNextPage: boolean;
};
