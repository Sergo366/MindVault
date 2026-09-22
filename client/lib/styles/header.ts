export const MENU_STYLES = {
  items: "origin-top-right absolute right-0 mt-4 w-56 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] bg-[#0D0D0F]/95 backdrop-blur-3xl border border-white/10 focus:outline-none py-2 overflow-hidden z-[100]",
  item: "flex items-center px-4 py-3 text-[14px] font-medium rounded-xl transition-all gap-3 w-full cursor-pointer",
  itemActive: "bg-primary/20 text-white font-semibold shadow-[0_0_20px_rgba(212,175,53,0.1)]",
  itemInactive: "text-stone-300 hover:text-white hover:bg-white/5",
  itemDanger: "bg-red-500/10 text-red-400 hover:bg-red-500/20",
  itemDangerInactive: "text-red-400/70 hover:text-red-400",
  icon: "h-4 w-4 transition-colors",
  iconActive: "text-primary",
  iconInactive: "text-stone-500",
  separator: "h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2 mx-4",
  header: "px-4 py-3 border-b border-white/5 mb-2 bg-gradient-to-b from-white/[0.02] to-transparent",
  headerLabel: "text-[11px] text-stone-500 font-bold uppercase tracking-widest mb-1.5",
  headerValue: "text-[14px] font-semibold text-white/90 truncate",
};

export const DROPDOWN_TRANSITION = {
  enter: "transition ease-out duration-150",
  enterFrom: "transform opacity-0 scale-98 translate-y-1",
  enterTo: "transform opacity-100 scale-100 translate-y-0",
  leave: "transition ease-in duration-100",
  leaveFrom: "transform opacity-100 scale-100 translate-y-0",
  leaveTo: "transform opacity-0 scale-98 translate-y-1",
};

export const CARD_STYLES = {
  base: "group relative bg-[#0e0e11] border border-white/10 md:border-white/[0.04] rounded-3xl p-4 hover:bg-[#121215] hover:border-primary/20 transition-all duration-500 cursor-pointer overflow-hidden hover:shadow-[0_0_40px_rgba(212,175,53,0.03)]",
  header: "flex justify-between items-center mb-5 relative z-20",
  title: "text-xl font-medium text-white/90 group-hover:text-white transition-colors duration-300",
};
