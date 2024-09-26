import { Authenticated, BodySchema, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { getTask, getTasksPage, insertTask, Task, updateTask } from '../../services/tasks/queries.js';
import { DateTime } from '../../services/gql/queries/generated/schema.js';
import { Session } from '@shopify/shopify-api';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { Request, Response } from 'express-serve-static-core';
import { UpsertTask } from '../../schemas/generated/upsert-task.js';
import { TaskPaginationOptions } from '../../schemas/generated/task-pagination-options.js';

@Authenticated()
export default class TasksController {
  @Get('/')
  @QuerySchema('task-pagination-options')
  async getTasks(req: Request<unknown, unknown, unknown, TaskPaginationOptions>, res: Response<GetTasksResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const { tasks, hasNextPage } = await getTasksPage(shop, paginationOptions);

    return res.json({
      tasks: tasks.map(mapTask),
      hasNextPage,
    });
  }

  @Get('/:id')
  async getTask(req: Request<{ id: string }>, res: Response<GetTaskResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { id } = req.params;

    const task = await getTask({ shop, id: Number(id) });

    if (!task) {
      throw new HttpError('Task not found', 404);
    }

    return res.json(mapTask(task));
  }

  @Post('/')
  @BodySchema('upsert-task')
  async createTask(req: Request<unknown, unknown, UpsertTask>, res: Response<GetTaskResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { name, description, estimatedTimeMinutes, deadline, done } = req.body;

    const task = await insertTask({
      shop,
      name,
      description,
      estimatedTimeMinutes,
      deadline: deadline ? new Date(deadline) : null,
      done,
    });

    return res.json(mapTask(task));
  }

  @Post('/:id')
  @BodySchema('upsert-task')
  async postTask(req: Request<{ id: string }, unknown, UpsertTask>, res: Response<GetTaskResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { id } = req.params;
    const { name, description, estimatedTimeMinutes, deadline, done } = req.body;

    const task = await updateTask({
      id: Number(id),
      shop,
      name,
      description,
      estimatedTimeMinutes,
      deadline: deadline ? new Date(deadline) : null,
      done,
    });

    return res.json(mapTask(task));
  }
}

export function mapTask(task: Task) {
  return {
    ...task,
    deadline: task.deadline ? (task.deadline.toISOString() as DateTime) : null,
    createdAt: task.createdAt.toISOString() as DateTime,
    updatedAt: task.updatedAt.toISOString() as DateTime,
  };
}

export type TaskResponse = ReturnType<typeof mapTask>;

export type GetTaskResponse = TaskResponse;

export type GetTasksResponse = {
  tasks: TaskResponse[];
  hasNextPage: boolean;
};
