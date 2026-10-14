import { Types, trusted } from 'mongoose';
import { ApplicationModel } from '../../applications/models/application.model';
import { CompanyModel } from '../../companies/models/company.model';
import { type OrbitTaskDoc } from '../models/orbit-task.model';
import { type TaskLinks } from '../mappers/orbit.mapper';

/** Looks up the names of the applications and companies that items are linked to, for display. */
export class OrbitLinkResolver {
  public async resolve(userId: string, tasks: OrbitTaskDoc[]): Promise<TaskLinks> {
    const appIds = Array.from(
      new Set(tasks.map((t) => t.applicationId?.toString()).filter((v): v is string => Boolean(v))),
    );
    const companyIds = Array.from(
      new Set(tasks.map((t) => t.companyId?.toString()).filter((v): v is string => Boolean(v))),
    );

    const [applications, companies] = await Promise.all([
      appIds.length
        ? ApplicationModel.find({
            userId: new Types.ObjectId(userId),
            _id: trusted({ $in: appIds.map((id) => new Types.ObjectId(id)) }),
          })
            .select('roleTitle companyName')
            .lean()
            .exec()
        : [],
      companyIds.length
        ? CompanyModel.find({
            _id: trusted({ $in: companyIds.map((id) => new Types.ObjectId(id)) }),
          })
            .select('name')
            .lean()
            .exec()
        : [],
    ]);

    return {
      applicationLabels: new Map(
        applications.map((a) => [a._id.toString(), `${a.roleTitle} at ${a.companyName}`]),
      ),
      companyNames: new Map(companies.map((c) => [c._id.toString(), c.name])),
    };
  }
}
