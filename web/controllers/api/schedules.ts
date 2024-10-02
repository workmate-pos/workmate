import {
  Authenticated,
  BodySchema,
  Delete,
  Get,
  Post,
  QuerySchema,
} from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { DAY_IN_MS } from '@work-orders/common/time/constants.js';
import { Session } from '@shopify/shopify-api';
import {
  deleteEmployeeAvailability,
  deleteSchedule,
  deleteScheduleEvent,
  deleteScheduleEventAssignments,
  deleteScheduleEventTasks,
  deleteSchedules,
  EmployeeAvailability,
  Schedule,
  ScheduleEvent,
  ScheduleEventAssignment,
  ScheduleEventTask,
  getEmployeeAvailabilities,
  getEmployeeAvailability,
  getSchedule,
  getScheduleEvent,
  getScheduleEventAssignments,
  getScheduleEvents,
  getScheduleEventTasks,
  getSchedules,
  insertEmployeeAvailability,
  insertSchedule,
  insertScheduleEvent,
  insertScheduleEventAssignments,
  insertScheduleEventTasks,
  updateEmployeeAvailability,
  updateSchedule,
  updateScheduleEvent,
  updateSchedules,
} from '../../services/schedules/queries.js';
import { SchedulesPaginationOptions } from '../../schemas/generated/schedules-pagination-options.js';
import { ScheduleEventsOptions } from '../../schemas/generated/schedule-events-options.js';
import { UpsertSchedule } from '../../schemas/generated/upsert-schedule.js';
import { UpsertScheduleEvent } from '../../schemas/generated/upsert-schedule-event.js';
import { DateTime } from '../../services/gql/queries/generated/schema.js';
import { mapTask, TaskResponse } from './tasks.js';
import { BulkUpsertSchedules } from '../../schemas/generated/bulk-upsert-schedules.js';
import { UpsertAvailability } from '../../schemas/generated/upsert-availability.js';
import { LocalsTeifiUser, Permission } from '../../decorators/permission.js';
import { AvailabilityOptions } from '../../schemas/generated/availability-options.js';
import { BulkDeleteSchedules } from '../../schemas/generated/bulk-delete-schedules.js';
import { unit } from '../../services/db/unit-of-work.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getTasks } from '../../services/tasks/queries.js';
import * as taskQueries from '../../services/tasks/queries.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

// TODO: Add to MANAGE_SCHEDULES permission to schedlue changing shit
// TODO: Bug when you move items where they are assigned to every task

@Authenticated()
// Add permission middleware so we can access res.locals.teifi.user
@Permission('none')
export default class SchedulesController {
  @Get('/')
  @QuerySchema('schedules-pagination-options')
  async getSchedules(
    req: Request<unknown, unknown, unknown, SchedulesPaginationOptions>,
    res: Response<GetSchedulesResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { query, offset, locationId, limit } = req.query;

    const { schedules, hasNextPage } = await getSchedules({
      shop,
      query,
      offset,
      locationId,
      limit,
    });

    return res.json({
      schedules: schedules.map(mapSchedule),
      hasNextPage,
    });
  }

  @Get('/:id/items')
  @QuerySchema('schedule-events-options')
  async getItemsFromTo(
    req: Request<{ id: string }, unknown, unknown, ScheduleEventsOptions>,
    res: Response<GetScheduleEventsResponse>,
  ) {
    const id = req.params.id;
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);
    const { staffMemberId, published, taskId } = req.query;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    if (
      !user.user.permissions?.includes('manage_schedules') &&
      !user.user.superuser &&
      staffMemberId !== user.staffMember.id
    ) {
      throw new HttpError('You are not authorized to view schedules of other staff members', 401);
    }

    if (id === 'all' && taskId === undefined) {
      assertDateRange(from, to);
    }

    const { shop }: Session = res.locals.shopify.session;

    const items = await getScheduleEvents({
      shop,
      from,
      to,
      taskId,
      published,
      staffMemberId,
      scheduleId: id === 'all' ? undefined : Number(id),
    });

    const [assignments, tasks] = await Promise.all([
      getScheduleEventAssignments(items.map(item => item.id)),
      getScheduleEventTasks(items.map(item => item.id)),
    ]);

    return res.json({
      items: items.map(item =>
        mapScheduleEvent(
          item,
          assignments.filter(assignment => assignment.ScheduleEventId === item.id),
          tasks,
        ),
      ),
    });
  }

  @Get('/:scheduleId/items/:itemId')
  async getScheduleEvent(
    req: Request<{ scheduleId: string; itemId: string }>,
    res: Response<GetScheduleEventResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { scheduleId, itemId } = req.params;

    const [schedule, item, assignments, tasks] = await Promise.all([
      getSchedule({ shop, id: Number(scheduleId) }),
      getScheduleEvent({ id: Number(itemId), scheduleId: Number(scheduleId) }),
      getScheduleEventAssignments([Number(itemId)]),
      getScheduleEventTasks([Number(itemId)]),
    ]);

    if (!schedule) {
      throw new HttpError('Schedule not found', 404);
    }

    if (!item) {
      throw new HttpError('Schedule item not found', 404);
    }

    return res.json(mapScheduleEvent(item, assignments, tasks));
  }

  @Get('/:scheduleId/items/:itemId/tasks')
  async getScheduleEventTasks(
    req: Request<{ scheduleId: string; itemId: string }>,
    res: Response<GetScheduleEventTasksResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { scheduleId, itemId } = req.params;

    // TODO: Unify this query with schedules/queries.js
    const tasks = await taskQueries.getScheduleEventTasks({
      shop,
      scheduleId: Number(scheduleId),
      itemId: Number(itemId),
    });

    return res.json(tasks.map(mapTask));
  }

  @Post('/')
  @BodySchema('upsert-schedule')
  async createSchedule(req: Request<unknown, unknown, UpsertSchedule>, res: Response<GetScheduleResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { name, locationId, publishedAt } = req.body;

    const schedule = await insertSchedule({
      shop,
      name,
      locationId,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
    });

    return res.json(mapSchedule(schedule));
  }

  @Post('/bulk')
  @BodySchema('bulk-upsert-schedules')
  async bulkUpsertSchedules(req: Request<unknown, unknown, BulkUpsertSchedules>, res: Response<GetScheduleResponse[]>) {
    const { shop }: Session = res.locals.shopify.session;

    const schedules = await updateSchedules(
      req.body.schedules.map(({ id, schedule }) => ({
        ...schedule,
        publishedAt: schedule.publishedAt ? new Date(schedule.publishedAt) : null,
        shop,
        id,
      })),
    );

    return res.json(schedules.map(mapSchedule));
  }

  @Delete('/bulk')
  @BodySchema('bulk-delete-schedules')
  async bulkDeleteSchedules(req: Request<unknown, unknown, BulkDeleteSchedules>, res: Response<GetScheduleResponse[]>) {
    const { shop }: Session = res.locals.shopify.session;

    await deleteSchedules(req.body.schedules.map(({ id }) => ({ id, shop })));

    return res.sendStatus(200);
  }

  @Get('/availability')
  @QuerySchema('availability-options')
  async getEmployeeAvailabilities(
    req: Request<unknown, unknown, unknown, AvailabilityOptions>,
    res: Response<GetAvailabilityResponse[]>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { from, to, staffMemberId } = req.query;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    if (
      !user.user.permissions?.includes('manage_schedules') &&
      !user.user.superuser &&
      staffMemberId !== user.staffMember.id
    ) {
      throw new HttpError('You are not authorized to view availabilities of other staff members', 401);
    }

    const availabilities = await getEmployeeAvailabilities({
      shop,
      from: new Date(from),
      to: new Date(to),
      staffMemberId,
    });

    return res.json(availabilities.map(mapEmployeeAvailability));
  }

  @Get('/availability/:id')
  async getEmployeeAvailability(req: Request<{ id: string }>, res: Response<GetAvailabilityResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { id } = req.params;

    const availability = await getEmployeeAvailability({ shop, id: Number(id) });

    if (!availability) {
      throw new HttpError('Availability not found', 404);
    }

    return res.json(mapEmployeeAvailability(availability));
  }

  @Post('/availability')
  @BodySchema('upsert-availability')
  async insertEmployeeAvailability(
    req: Request<unknown, unknown, UpsertAvailability>,
    res: Response<GetAvailabilityResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { staffMemberId, start, end, available } = req.body;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    if (
      !user.user.permissions?.includes('manage_schedules') &&
      !user.user.superuser &&
      staffMemberId !== user.staffMember.id
    ) {
      throw new HttpError('You are not authorized to edit availabilities for other staff members', 401);
    }

    const availability = await insertEmployeeAvailability({
      shop,
      staffMemberId,
      start: new Date(start),
      end: new Date(end),
      available,
    });

    return res.json(mapEmployeeAvailability(availability));
  }

  @Post('/availability/:id')
  @BodySchema('upsert-availability')
  async updateEmployeeAvailability(
    req: Request<{ id: string }, unknown, UpsertAvailability>,
    res: Response<GetAvailabilityResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { id } = req.params;
    const { staffMemberId, start, end, available } = req.body;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    if (
      !user.user.permissions?.includes('manage_schedules') &&
      !user.user.superuser &&
      staffMemberId !== user.staffMember.id
    ) {
      throw new HttpError('You are not authorized to edit availabilities for other staff members', 401);
    }

    const availability = await updateEmployeeAvailability({
      id: Number(id),
      shop,
      staffMemberId,
      start: new Date(start),
      end: new Date(end),
      available,
    });

    return res.json(mapEmployeeAvailability(availability));
  }

  @Delete('/availability/:id')
  async deleteEmployeeAvailability(
    req: Request<{ id: string }, unknown, UpsertAvailability>,
    res: Response<GetAvailabilityResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { id } = req.params;
    const {
      staffMember: { id: staffMemberId },
    }: LocalsTeifiUser = res.locals.teifi.user;

    const user: LocalsTeifiUser = res.locals.teifi.user;

    if (
      !user.user.permissions?.includes('manage_schedules') &&
      !user.user.superuser &&
      staffMemberId !== user.staffMember.id
    ) {
      throw new HttpError('You are not authorized to delete availabilities for other staff members', 401);
    }

    await deleteEmployeeAvailability({ id: Number(id), shop, staffMemberId });

    return res.sendStatus(200);
  }

  @Get('/:id')
  async getSchedule(
    req: Request<{ id: string }, unknown, unknown, SchedulesPaginationOptions>,
    res: Response<GetScheduleResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { id } = req.params;

    const schedule = await getSchedule({ shop, id: Number(id) });

    if (!schedule) {
      throw new HttpError('Schedule not found', 404);
    }

    return res.json(mapSchedule(schedule));
  }

  @Post('/:id')
  @BodySchema('upsert-schedule')
  async updateSchedule(req: Request<{ id: string }, unknown, UpsertSchedule>, res: Response<GetScheduleResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { id } = req.params;
    const { name, locationId, publishedAt } = req.body;

    const schedule = await updateSchedule({
      id: Number(id),
      shop,
      name,
      locationId,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
    });

    return res.json(mapSchedule(schedule));
  }

  @Post('/:id/items')
  @BodySchema('upsert-schedule-event')
  async createScheduleEvent(
    req: Request<{ id: string }, unknown, UpsertScheduleEvent>,
    res: Response<GetScheduleEventResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { id } = req.params;
    const { name, description, staffMemberIds, start, end, color, taskIds } = req.body;

    const [schedule, tasks] = await Promise.all([getSchedule({ shop, id: Number(id) }), getTasks(shop, taskIds)]);

    if (!schedule) {
      throw new HttpError('Schedule not found', 404);
    }

    if (tasks.length !== unique(taskIds).length) {
      throw new HttpError('Some tasks were not found', 404);
    }

    return await unit(async () => {
      const item = await insertScheduleEvent({
        scheduleId: Number(id),
        name,
        description,
        start: new Date(start),
        end: new Date(end),
        color,
      });

      const [assignments, tasks] = await Promise.all([
        insertScheduleEventAssignments(
          staffMemberIds.map(staffMemberId => ({ ScheduleEventId: item.id, staffMemberId })),
        ),
        insertScheduleEventTasks(taskIds.map(taskId => ({ itemId: item.id, taskId }))),
      ]);

      return res.json(mapScheduleEvent(item, assignments, tasks));
    });
  }

  @Post('/:id/items/:itemId')
  @BodySchema('upsert-schedule-event')
  async upsertScheduleEvents(
    req: Request<{ id: string; itemId: string }, unknown, UpsertScheduleEvent>,
    res: Response<GetScheduleEventResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { id, itemId } = req.params;
    const { name, description, staffMemberIds, start, end, taskIds, color } = req.body;

    const [schedule, tasks] = await Promise.all([getSchedule({ shop, id: Number(id) }), getTasks(shop, taskIds)]);

    if (!schedule) {
      throw new HttpError('Schedule not found', 404);
    }

    if (tasks.length !== unique(taskIds).length) {
      throw new HttpError('Some tasks were not found', 404);
    }

    return await unit(async () => {
      const [item] = await Promise.all([
        updateScheduleEvent({
          id: Number(itemId),
          scheduleId: Number(id),
          name,
          description,
          start: new Date(start),
          end: new Date(end),
          color,
        }),
        deleteScheduleEventAssignments({ ScheduleEventId: Number(itemId) }),
        deleteScheduleEventTasks({ ScheduleEventId: Number(itemId) }),
      ]);

      const [assignments, tasks] = await Promise.all([
        insertScheduleEventAssignments(
          staffMemberIds.map(staffMemberId => ({ ScheduleEventId: Number(itemId), staffMemberId })),
        ),

        insertScheduleEventTasks(taskIds.map(taskId => ({ itemId: Number(itemId), taskId }))),
      ]);

      return res.json(mapScheduleEvent(item, assignments, tasks));
    });
  }

  @Delete('/:id')
  async deleteSchedule(req: Request<{ id: string }>, res: Response) {
    const { shop }: Session = res.locals.shopify.session;
    const { id } = req.params;

    const schedule = await getSchedule({ shop, id: Number(id) });

    if (!schedule) {
      throw new HttpError('Schedule not found', 404);
    }

    await deleteScheduleEvent({ scheduleId: Number(id) });
    await deleteSchedule({ shop, id: Number(id) });

    return res.sendStatus(200);
  }

  @Delete('/:id/items/:itemId')
  async deleteScheduleEvent(req: Request<{ id: string; itemId: string }>, res: Response) {
    const { shop }: Session = res.locals.shopify.session;
    const { id, itemId } = req.params;

    const schedule = await getSchedule({ shop, id: Number(id) });

    if (!schedule) {
      throw new HttpError('Schedule not found', 404);
    }

    await deleteScheduleEvent({ id: Number(itemId), scheduleId: Number(id) });

    return res.sendStatus(200);
  }
}

export type ScheduleResponse = Omit<Schedule, 'publishedAt' | 'createdAt' | 'updatedAt'> & {
  publishedAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type ScheduleEventResponse = Omit<ScheduleEvent, 'createdAt' | 'updatedAt' | 'start' | 'end'> & {
  start: DateTime;
  end: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
  assignedStaffMemberIds: ID[];
  taskIds: number[];
};

export type EmployeeAvailabilityResponse = Omit<EmployeeAvailability, 'start' | 'end' | 'createdAt' | 'updatedAt'> & {
  start: DateTime;
  end: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
};

function mapSchedule(schedule: Schedule): ScheduleResponse {
  return {
    ...schedule,
    publishedAt: schedule.publishedAt ? (schedule.publishedAt.toISOString() as DateTime) : null,
    createdAt: schedule.createdAt.toISOString() as DateTime,
    updatedAt: schedule.updatedAt.toISOString() as DateTime,
  };
}

function mapScheduleEvent(
  item: ScheduleEvent,
  assignments: ScheduleEventAssignment[],
  tasks: ScheduleEventTask[],
): ScheduleEventResponse {
  return {
    ...item,
    start: item.start.toISOString() as DateTime,
    end: item.end.toISOString() as DateTime,
    createdAt: item.createdAt.toISOString() as DateTime,
    updatedAt: item.updatedAt.toISOString() as DateTime,
    assignedStaffMemberIds: unique(assignments.map(({ staffMemberId }) => staffMemberId)),
    taskIds: unique(tasks.map(({ taskId }) => taskId)),
  };
}

function mapEmployeeAvailability(availability: EmployeeAvailability): EmployeeAvailabilityResponse {
  return {
    ...availability,
    createdAt: availability.createdAt.toISOString() as DateTime,
    updatedAt: availability.updatedAt.toISOString() as DateTime,
    start: availability.start.toISOString() as DateTime,
    end: availability.end.toISOString() as DateTime,
  };
}

export type GetScheduleEventsResponse = {
  items: ScheduleEventResponse[];
};

export type GetSchedulesResponse = {
  schedules: ScheduleResponse[];
  hasNextPage: boolean;
};

export type GetScheduleResponse = ScheduleResponse;
export type GetScheduleEventResponse = ScheduleEventResponse;
export type GetScheduleEventTasksResponse = TaskResponse[];
export type GetAvailabilityResponse = EmployeeAvailabilityResponse;
export type GetAvailabilitiesResponse = EmployeeAvailabilityResponse[];

const MAX_DAYS = 365;

function assertDateRange(from: Date, to: Date) {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new HttpError('Invalid date', 400);
  }

  if (from > to) {
    throw new HttpError('Invalid date range, from date must be before end date', 400);
  }

  const rangeSizeMs = to.getTime() - from.getTime();
  const rangeSizeDays = rangeSizeMs / DAY_IN_MS;

  if (rangeSizeDays > MAX_DAYS) {
    throw new HttpError(`Date range is too large, must be less than ${MAX_DAYS} days`, 400);
  }
}
