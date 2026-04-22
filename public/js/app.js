document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('transcribeForm');
    const submitBtn = document.getElementById('submitBtn');
    const loader = document.getElementById('loader');
    const errorBox = document.getElementById('errorBox');
    const errorText = document.getElementById('errorText');
    const results = document.getElementById('results');
    const resultText = document.getElementById('resultText');
    const modeBadge = document.getElementById('modeBadge');
    const copyBtn = document.getElementById('copyBtn');
    const statusText = document.getElementById('statusText');

    const loadingPhases = [
        "Downloading audio from Facebook...",
        "Extracted! Preparing for AI analysis...",
        "🎙️ OpenAI Whisper is transcribing...",
        " почти готово (almost ready)...",
        "🧠 GPT-4o-mini is summarizing..."
    ];

    let phaseIndex = 0;
    let phaseInterval;

    const updateStatusText = () => {
        if (phaseIndex < loadingPhases.length - 1) {
            phaseIndex++;
            statusText.innerText = loadingPhases[phaseIndex];
        }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI Reset
        errorBox.style.display = 'none';
        results.style.display = 'none';
        loader.style.display = 'block';
        submitBtn.disabled = true;
        phaseIndex = 0;
        statusText.innerText = loadingPhases[0];

        // Animated status messages
        phaseInterval = setInterval(updateStatusText, 8000);

        const formData = {
            url: document.getElementById('url').value,
            mode: document.getElementById('mode').value
        };

        try {
            const response = await fetch('/transcribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            // Success UI
            modeBadge.innerText = data.mode.charAt(0).toUpperCase() + data.mode.slice(1);
            resultText.innerText = data.result;
            results.style.display = 'block';
            
            // Scroll to results
            results.scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            errorText.innerText = err.message;
            errorBox.style.display = 'block';
        } finally {
            loader.style.display = 'none';
            submitBtn.disabled = false;
            clearInterval(phaseInterval);
        }
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(resultText.innerText).then(() => {
            const originalText = copyBtn.innerText;
            copyBtn.innerText = '✅ Copied!';
            copyBtn.style.color = '#fff';
            setTimeout(() => {
                copyBtn.innerText = originalText;
            }, 2000);
        });
    });
});
