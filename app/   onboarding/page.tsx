export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-margin-mobile bg-background text-on-surface text-center">
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold mb-2">
        ¡Cuenta creada!
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
        Aquí irá el flujo de onboarding: conectar tu primera tarjeta, tu
        ingreso mensual y tu primera deuda. Por ahora, puedes ir directo al{" "}
        <a href="/dashboard" className="text-primary font-semibold underline">
          Dashboard
        </a>
        .
      </p>
    </div>
  );
}
