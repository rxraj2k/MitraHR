import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

// App-wide safety net for raw Prisma errors that would otherwise reach the
// client as an unhandled 500 with a stack trace (e.g. saving a Department
// or Designation whose name already exists, thanks to their `@unique`
// constraint). Every Master Data lookup — and any other `@unique`/relational
// model added later — gets a friendly, consistent error for free, without
// each service needing its own pre-check.
//
// This does NOT replace a service's own explicit usage-count guard (e.g.
// DepartmentsService.remove() checking employee.count() before deleting) —
// those give a much more specific message ("3 employees still assigned")
// than a generic P2003 ever could. This filter only catches what slips
// through: constraint violations nothing already validated for.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation — e.g. creating/renaming a Department
        // to a name that already exists.
        const target = exception.meta?.target;
        const field = Array.isArray(target) ? target[0] : typeof target === 'string' ? target : 'value';
        const friendlyField = String(field).replace(/_/g, ' ');
        const body = new ConflictException(
          `A record with this ${friendlyField} already exists. Please use a different value.`,
        ).getResponse();
        return response.status(409).json(body);
      }
      case 'P2025': {
        // Record to update/delete was not found (e.g. deleted by someone
        // else a moment earlier).
        const body = new NotFoundException('The record you tried to change no longer exists.').getResponse();
        return response.status(404).json(body);
      }
      case 'P2003': {
        // Foreign-key constraint failed on delete — a safety net for any
        // relation that doesn't already have its own explicit usage-count
        // guard in the service layer.
        const body = new ConflictException(
          'This record is still referenced by other data and cannot be deleted.',
        ).getResponse();
        return response.status(409).json(body);
      }
      default: {
        // Anything else stays a 500 — we don't know what it means, so a
        // vague "success" status would be worse than the current behavior.
        const body = { statusCode: 500, message: 'An unexpected database error occurred.' };
        return response.status(500).json(body);
      }
    }
  }
}
