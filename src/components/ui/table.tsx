import { cn } from '@/lib/utils'

const Table = ({
  className,
  containerClassName,
  scrollable,
  ...props
}: React.HTMLAttributes<HTMLTableElement> & {
  containerClassName?: string
  /** Wide tables: expand to column content and scroll horizontally on narrow screens */
  scrollable?: boolean
}) => (
  <div
    className={cn(
      'relative w-full',
      scrollable
        ? 'overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]'
        : 'overflow-auto',
      containerClassName,
    )}
  >
    <table
      className={cn(
        scrollable ? 'w-max table-auto' : 'w-full',
        'caption-bottom text-sm',
        className,
      )}
      {...props}
    />
  </div>
)

const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('[&_tr]:border-b', className)} {...props} />
)

const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
)

const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)} {...props} />
)

const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('h-10 px-2 text-left align-middle font-medium text-muted-foreground', className)} {...props} />
)

const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('p-2 align-middle', className)} {...props} />
)

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }