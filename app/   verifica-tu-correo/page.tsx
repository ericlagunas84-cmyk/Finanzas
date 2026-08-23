export default function VerificaTuCorreoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-margin-mobile bg-background text-on-surface text-center">
      <span className="material-symbols-outlined text-primary text-[40px] mb-3">mail</span>
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold mb-2">
        Revisa tu correo
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
        Te enviamos un enlace de confirmación. Ábrelo desde tu correo para
        activar tu cuenta y empezar a usar la app.
      </p>
    </div>
  );
}
