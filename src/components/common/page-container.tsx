import Link from "next/link";
import { ReactNode } from "react";

type Breadcrumb = {
  label: string;
  href?: string;
};

type PageContainerProps = {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  children?: ReactNode;
};

export default function PageContainer({
  title,
  description,
  breadcrumbs,
  children,
}: PageContainerProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-md">
      <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white p-6">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {breadcrumbs.map((crumb, index) => (
              <div key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                {crumb.href ? (
                  <Link href={crumb.href} className="font-medium text-indigo-700 hover:text-indigo-800">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-600">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 ? <span>/</span> : null}
              </div>
            ))}
          </div>
        ) : null}
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-slate-700">{description}</p>
        ) : null}
      </div>
      <div className="p-6">{children ? <div>{children}</div> : null}</div>
    </div>
  );
}
