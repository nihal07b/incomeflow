
import { useEffect, useRef, useState } from "react";

type SpeechResult = {
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognizer = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechResult) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};

type SpeechConstructor = new () => SpeechRecognizer;

type SpeechWindow = Window & {
    SpeechRecognition?: SpeechConstructor;
    webkitSpeechRecognition?: SpeechConstructor;
};

export default function SaathiMicrophone({
    onTranscript,
}: {
    onTranscript: (text: string) => void;
}) {
    const [listening, setListening] = useState(false);
    const [error, setError] = useState("");
    const recognitionRef = useRef<SpeechRecognizer | null>(null);

    useEffect(() => {
        return () => recognitionRef.current?.stop();
    }, []);

    function startListening() {
        const speechWindow = window as SpeechWindow;
        const Recognition =
            speechWindow.SpeechRecognition ??
            speechWindow.webkitSpeechRecognition;

        if (!Recognition) {
            setError("Voice input is not supported in this browser.");
            return;
        }

        setError("");

        const recognition = new Recognition();
        recognition.lang = "hi-IN";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0]?.[0]?.transcript;
            if (transcript) onTranscript(transcript);
        };

        recognition.onerror = () => {
            setError("Could not recognize speech. Please try again.");
            setListening(false);
        };

        recognition.onend = () => setListening(false);

        recognitionRef.current = recognition;

        try {
            recognition.start();
            setListening(true);
        } catch {
            setError("Microphone could not start.");
            setListening(false);
        }
    }

    function stopListening() {
        recognitionRef.current?.stop();
        setListening(false);
    }

    return (
        <div>
            <button
                type="button"
                onClick={listening ? stopListening : startListening}
                aria-label={listening ? "Stop recording" : "Start voice input"}
                className={`rounded-lg px-3 py-2 text-white ${listening ? "bg-red-600" : "bg-blue-600"
                    }`}
            >
                {listening ? "⏹" : "🎤"}
            </button>

            {error && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}

