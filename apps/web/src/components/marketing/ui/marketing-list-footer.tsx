export function MarketingListFooter() {
  return (
    <footer className="h-16 border-t border-gray-200 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md shrink-0">
      <p className="text-label-caps text-gray-500">© {new Date().getFullYear()} FlowChat Automation</p>
      <div className="flex items-center gap-6">
        <a href="#" className="text-label-caps text-gray-500 hover:text-primary transition-colors">
          Help Center
        </a>
        <a href="#" className="text-label-caps text-gray-500 hover:text-primary transition-colors">
          Privacy Policy
        </a>
      </div>
    </footer>
  );
}
