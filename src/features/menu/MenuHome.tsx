import { Link } from 'react-router-dom';
import {
  FolderTree,
  Coffee,
  SlidersHorizontal,
  CakeSlice,
  ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/shared/ui';

const links = [
  {
    to: '/menu/categories',
    label: 'Categories',
    description: 'Organize products for browsing.',
    icon: FolderTree,
    well: 'icon-well-sky',
  },
  {
    to: '/menu/products',
    label: 'Products',
    description: 'Pricing, images, and availability.',
    icon: Coffee,
    well: 'icon-well-primary',
  },
  {
    to: '/menu/customizations',
    label: 'Customizations',
    description: 'Milk, size, extras, and more.',
    icon: SlidersHorizontal,
    well: 'icon-well-amber',
  },
  {
    to: '/menu/cake-of-day',
    label: 'Cake of the day',
    description: 'Publish today’s featured cake.',
    icon: CakeSlice,
    well: 'icon-well-gold',
  },
  {
    to: '/menu/home-banner',
    label: 'Home banner',
    description: 'Change the customer app home promo image (1200×576).',
    icon: ImageIcon,
    well: 'icon-well-primary',
  },
] as const;

export function MenuHome() {
  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Menu"
        description="Keep the customer menu accurate and available. Café ops live under Settings."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map(({ to, label, description, icon: Icon, well }) => (
          <Link
            className="card-interactive group flex items-start gap-4 p-5 focus-visible:outline-none"
            to={to}
            key={to}
          >
            <span className={`icon-well ${well} size-12`}>
              <Icon size={20} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="block font-semibold text-[var(--foreground)]">
                  {label}
                </span>
                <ArrowRight
                  size={16}
                  className="text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-sm text-[var(--muted-foreground)]">
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
