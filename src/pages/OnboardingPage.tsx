
import { useState } from 'react'
import type { DemoUser, GigWorkerJob } from '../types'

interface OnboardingPageProps {
    email: string
    onComplete: (user: DemoUser) => void
}

const jobs: { value: GigWorkerJob; label: string }[] = [
    { value: 'food-delivery', label: 'Food Delivery Rider' },
    { value: 'quick-commerce', label: 'Quick Commerce Delivery' },
    { value: 'bike-taxi', label: 'Bike Taxi Rider' },
    { value: 'cab-driver', label: 'Cab Driver' },
    { value: 'freelancer', label: 'Freelancer' },
    { value: 'other', label: 'Other Gig Worker' },
]

const platforms: Record<GigWorkerJob, string[]> = {
    'food-delivery': ['Swiggy', 'Zomato', 'Other'],
    'quick-commerce': ['Blinkit', 'Zepto', 'Instamart', 'Other'],
    'bike-taxi': ['Rapido', 'Uber', 'Ola', 'Other'],
    'cab-driver': ['Uber', 'Ola', 'Other'],
    freelancer: ['Upwork', 'Fiverr', 'Other'],
    other: ['Independent', 'Other'],
}

export function OnboardingPage({
    email,
    onComplete,
}: OnboardingPageProps) {
    const [name, setName] = useState('')
    const [age, setAge] = useState('')
    const [job, setJob] = useState<GigWorkerJob>('food-delivery')
    const [platform, setPlatform] = useState('Swiggy')
    const [error, setError] = useState('')

    const handleJobChange = (value: GigWorkerJob) => {
        setJob(value)
        setPlatform(platforms[value][0])
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const parsedAge = Number(age)

        if (!name.trim()) {
            setError('Please enter your full name.')
            return
        }

        if (!Number.isInteger(parsedAge) || parsedAge < 18 || parsedAge > 100) {
            setError('Please enter a valid age between 18 and 100.')
            return
        }

        onComplete({
            id: crypto.randomUUID(),
            name: name.trim(),
            email,
            age: parsedAge,
            job,
            platform,
            onboardingComplete: true,
        })
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 px-4 py-10">
            <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
                <div className="mb-7">
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                        STEP 2 OF 2
                    </span>

                    <h1 className="mt-4 text-3xl font-bold text-slate-900">
                        Tell us about yourself
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Complete your gig-worker profile to get started with IncomeFlow.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="worker-name" className="mb-2 block text-sm font-medium text-slate-700">
                            Full Name
                        </label>
                        <input
                            id="worker-name"
                            type="text"
                            required
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Enter your full name"
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
                        />
                    </div>

                    <div>
                        <label htmlFor="worker-age" className="mb-2 block text-sm font-medium text-slate-700">
                            Age
                        </label>
                        <input
                            id="worker-age"
                            type="number"
                            required
                            min={18}
                            max={100}
                            value={age}
                            onChange={(event) => setAge(event.target.value)}
                            placeholder="Enter your age"
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
                        />
                    </div>

                    <div>
                        <label htmlFor="worker-job" className="mb-2 block text-sm font-medium text-slate-700">
                            What type of gig work do you do?
                        </label>
                        <select
                            id="worker-job"
                            value={job}
                            onChange={(event) => handleJobChange(event.target.value as GigWorkerJob)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-teal-600"
                        >
                            {jobs.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="worker-platform" className="mb-2 block text-sm font-medium text-slate-700">
                            Which platform do you work with?
                        </label>
                        <select
                            id="worker-platform"
                            value={platform}
                            onChange={(event) => setPlatform(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-teal-600"
                        >
                            {platforms[job].map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>

                    {error && (
                        <p role="alert" className="text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="w-full rounded-xl bg-teal-700 py-3 font-bold text-white transition hover:bg-teal-800"
                    >
                        Complete Setup & Open Dashboard
                    </button>
                </form>

                <p className="mt-5 text-center text-xs text-slate-500">
                    Demo mode: Your profile will be saved locally in this browser.
                </p>
            </div>
        </main>
    )
}
