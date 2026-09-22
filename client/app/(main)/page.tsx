export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl">
        Welcome to <span className="text-primary italic">MindVault</span>
      </h1>
      <p className="text-stone-500 text-xl max-w-2xl">
        Your ultimate knowledge and investment hub.
      </p>
    </div>
  );
}
