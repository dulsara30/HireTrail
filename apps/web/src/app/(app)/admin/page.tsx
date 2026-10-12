import { redirect } from 'next/navigation';
import { ROUTES } from '../../../constants/routes';

/** /admin has no page of its own: it opens the first admin section. */
export default function AdminIndexPage(): never {
  redirect(ROUTES.admin.users);
}
