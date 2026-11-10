export default function OfflinePage() {
    return (
    <main className="min-h-screen grid place-items-center p-6">
    <section className="max-w-md rounded-2xl p-8 text-center shadow-xl">
    <p className="text-sm font-semibold">MODE HORS LIGNE</p>
    <h1 className="mt-2 text-3xl font-bold">Vous êtes hors connexion</h1>
    <p className="mt-3 text-slate-600">
    Le Service Worker peut encore fournir
    certaines ressources de l’application.
    </p>
    </section>
    </main>
    
    )
    }