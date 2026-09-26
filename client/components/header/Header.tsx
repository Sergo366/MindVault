'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Brain, LogOut, Settings, User } from 'lucide-react';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { MENU_STYLES, DROPDOWN_TRANSITION } from '@/lib/styles/header';
import { Fragment, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { classNames } from '@/lib/styles/classNames';
import { useUserProfile } from '@/hooks/use-user';

const navigation = [
  { name: 'Knowledge', href: '/knowledge' },
  { name: 'Investments', href: '/investments' },
];

export default function Header() {
  const { data: userData } = useUserProfile()
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleLogout = () => {
    Cookies.remove('access_token');
    router.push('/auth');
  };

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full h-16">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-b border-white/5" />
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#A855F7]/40 to-transparent" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-b border-white/5" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#A855F7]/40 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary/20 p-1.5 rounded-xl group-hover:bg-primary/30 transition-colors">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground hidden sm:block">MindVault</span>
            </Link>
          </div>

          {/* Navigation Tabs - Desktop */}
          <nav className="hidden md:flex space-x-1 bg-white/5 p-1 rounded-xl border border-white/5">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={classNames(
                    'relative px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300 group',
                    isActive ? 'text-white' : 'text-stone-400 hover:text-foreground hover:bg-white/5'
                  )}
                >
                  <span className={classNames(
                    'relative z-10 transition-colors duration-300',
                    isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-200'
                  )}>
                    {item.name}
                  </span>
                  
                  {isActive && (
                    <>
                      <div className="absolute inset-0 bg-white/[0.03] rounded-xl" />
                      <div className="absolute -bottom-[5px] inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#A855F7] to-transparent opacity-80" />
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">

            {/* Profile Dropdown */}
            <HeadlessMenu as="div" className="relative">
              <HeadlessMenu.Button className="flex text-sm rounded-full focus:outline-none transition-all p-0.5 border border-white/10 hover:border-primary/40 group overflow-hidden cursor-pointer">
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-[#1A1A1E] flex items-center justify-center text-stone-400 font-bold text-xs ring-1 ring-white/5 group-hover:text-primary group-hover:bg-primary/5 transition-all overflow-hidden">
                  {userData?.profileImg ? <Image src={userData?.profileImg} alt="" width={32} height={32} className="w-full h-full object-cover" /> : 'User'}
                </div>
              </HeadlessMenu.Button>
              <Transition
                as={Fragment}
                {...DROPDOWN_TRANSITION}
              >
                <HeadlessMenu.Items className={MENU_STYLES.items}>
                  <div className={MENU_STYLES.header}>
                    <p className={MENU_STYLES.headerLabel}>Authenticated</p>
                    <p className={MENU_STYLES.headerValue}>{userData?.email}</p>
                  </div>
                  
                  <div className="px-1.5 space-y-0.5">
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <Link
                          href="/profile"
                          className={classNames(
                            active ? MENU_STYLES.itemActive : MENU_STYLES.itemInactive,
                            MENU_STYLES.item
                          )}
                        >
                          <User className={classNames(MENU_STYLES.icon, active ? MENU_STYLES.iconActive : MENU_STYLES.iconInactive)} />
                          Your Profile
                        </Link>
                      )}
                    </HeadlessMenu.Item>
                    
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <Link
                          href="/settings"
                          className={classNames(
                            active ? MENU_STYLES.itemActive : MENU_STYLES.itemInactive,
                            MENU_STYLES.item
                          )}
                        >
                          <Settings className={classNames(MENU_STYLES.icon, active ? MENU_STYLES.iconActive : MENU_STYLES.iconInactive)} />
                          Settings
                        </Link>
                      )}
                    </HeadlessMenu.Item>
                  </div>

                  <div className={MENU_STYLES.separator} />
                  
                  <div className="px-1.5">
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={classNames(
                            active ? MENU_STYLES.itemDanger : MENU_STYLES.itemInactive,
                            MENU_STYLES.item
                          )}
                        >
                          <LogOut className={MENU_STYLES.icon} />
                          Sign out
                        </button>
                      )}
                    </HeadlessMenu.Item>
                  </div>
                </HeadlessMenu.Items>
              </Transition>
            </HeadlessMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
