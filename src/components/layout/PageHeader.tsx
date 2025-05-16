import { cn } from "@/lib/utils";
import React from "react";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

function PageHeader({ className, children, ...props }: PageHeaderProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-2 pb-6 pt-2 md:pb-8 md:pt-4",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

interface PageHeaderHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {}

function PageHeaderHeading({ className, children, ...props }: PageHeaderHeadingProps) {
  return (
    <h1
      className={cn(
        "text-3xl font-bold leading-tight tracking-tighter md:text-4xl lg:leading-[1.1]",
        "flex items-center", // Added for icon alignment
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

interface PageHeaderDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function PageHeaderDescription({
  className,
  children,
  ...props
}: PageHeaderDescriptionProps) {
  return (
    <p
      className={cn(
        "max-w-[750px] text-base text-muted-foreground sm:text-lg",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export { PageHeader, PageHeaderHeading, PageHeaderDescription };
