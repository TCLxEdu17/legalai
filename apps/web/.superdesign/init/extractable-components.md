# Extractable Components — LegalAI

Components worth extracting as reusable DraftComponents for the design system.

---

## Layout Components

### AppSidebar
- **Source:** `src/components/layout/sidebar.tsx`
- **Category:** layout
- **Description:** Collapsible navigation sidebar with 7 nav groups, hover-to-expand on desktop, slide-in on mobile
- **Props:** `mobileOpen?: boolean`, `onClose?: () => void`
- **Key visual:** Dark bg `#0a0a0a`, brand-600/15 active highlight, icon-only collapsed state

### AppHeader
- **Source:** `src/components/layout/header.tsx`
- **Category:** layout
- **Description:** Top header bar with theme toggle, notification bell with badge, user avatar + dropdown
- **Props:** `onMenuToggle?: () => void`
- **Key visual:** `h-14`, blurred dark bg, bell badge in red-500

### DashboardLayout
- **Source:** `src/app/dashboard/layout.tsx`
- **Category:** layout
- **Description:** Full dashboard shell — sidebar + header + scrollable main content
- **Props:** `children: ReactNode`

---

## Basic UI Components

### DarkCard
- **Source:** CSS class `.dark-card` in `globals.css`
- **Category:** basic
- **Description:** Card with dark bg (#141414), subtle border, animated light-sweep effect
- **Usage:** `<div className="dark-card rounded-xl p-5">...</div>`

### PlanetLoader
- **Source:** `src/components/ui/planet-loader.tsx`
- **Category:** basic
- **Description:** Animated SVG planet-ring loader, 4 sizes (xs/sm/md/lg)
- **Props:** `size?: 'xs' | 'sm' | 'md' | 'lg'`, `className?: string`

### StatusBadge
- **Source:** Inline pattern in pages (not extracted yet)
- **Category:** basic
- **Description:** Colored pill badge for status (INDEXED=emerald, FAILED=red, etc.)
- **Example:**
  ```tsx
  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
    Indexado
  </span>
  ```

### SearchInput
- **Source:** Inline pattern in multiple pages
- **Category:** basic
- **Description:** Dark-themed search input with Search icon left
- **Example:**
  ```tsx
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
    <input
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
      placeholder="Buscar..."
    />
  </div>
  ```

### PageHeader
- **Source:** Pattern across all pages
- **Category:** basic
- **Description:** Page title + subtitle + optional action button row
- **Example:**
  ```tsx
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-xl font-semibold text-slate-100">Título</h1>
      <p className="text-slate-500 text-sm mt-0.5">Subtítulo</p>
    </div>
    <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors">
      <Plus className="w-4 h-4" />
      Nova Ação
    </button>
  </div>
  ```

### TabBar
- **Source:** Pattern in casos/[id] and radares/[id] pages
- **Category:** basic
- **Description:** Tab navigation row, brand-600 underline indicator
- **Example:**
  ```tsx
  <div className="flex border-b border-white/[0.06] mb-6 gap-1">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={cn(
          'px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2',
          activeTab === tab.id
            ? 'text-brand-400 border-b-2 border-brand-500 -mb-px'
            : 'text-slate-500 hover:text-slate-300'
        )}
      >
        <tab.icon className="w-4 h-4" />
        {tab.label}
      </button>
    ))}
  </div>
  ```

### EmptyState
- **Source:** Pattern across pages
- **Category:** basic
- **Description:** Centered empty state with icon, title, description and optional CTA
- **Example:**
  ```tsx
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Icon className="w-12 h-12 text-slate-700 mb-4" />
    <p className="text-slate-400 font-medium mb-1">Sem itens</p>
    <p className="text-slate-600 text-sm">Nenhum item encontrado.</p>
  </div>
  ```

### ModalOverlay
- **Source:** Inline pattern in pages (modais de criação)
- **Category:** basic
- **Description:** Fixed backdrop + centered modal card
- **Example:**
  ```tsx
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-[#141414] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl">
      {/* content */}
    </div>
  </div>
  ```
