import Link from 'next/link';
import { Button } from '../components/atoms/Button';
import { EmptyState } from '../components/molecules/EmptyState';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-page">
      <EmptyState
        title="Page Not Found"
        description="The page you are looking for does not exist or has been moved."
        action={
          <Link href="/">
            <Button variant="primary">Return Home</Button>
          </Link>
        }
      />
    </div>
  );
}
