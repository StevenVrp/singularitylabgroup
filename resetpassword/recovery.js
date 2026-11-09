const form = document.getElementById('new-password-form');
const statusText = document.getElementById('reset-status');
const retryLink = document.getElementById('retry-link');
const save = document.getElementById('save-password');
let recoveryClient;

function showInvalidLink() {
    form.hidden = true;
    retryLink.hidden = false;
    statusText.textContent = 'This recovery link is invalid or has expired. Request a new link to try again.';
}

async function openRecoveryLink() {
    const hash = new URLSearchParams(location.hash.slice(1));
    const query = new URLSearchParams(location.search);
    history.replaceState(null, '', location.pathname);
    const implicit = hash.get('type') === 'recovery' && hash.get('access_token') && hash.get('refresh_token');
    const tokenHash = query.get('type') === 'recovery' && query.get('token_hash');
    if ((!implicit && !tokenHash) || hash.has('error') || query.has('error')) {
        showInvalidLink();
        return;
    }

    try {
        recoveryClient = createLabAuthClient({
            persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
            storageKey: 'singularity-lab-recovery'
        });
        const { data, error } = implicit
            ? await recoveryClient.auth.setSession({
                access_token: hash.get('access_token'), refresh_token: hash.get('refresh_token')
            })
            : await recoveryClient.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
        if (error || !data.session) return showInvalidLink();
        form.hidden = false;
        statusText.textContent = 'Choose a new password for your Singularity Lab account.';
        document.getElementById('new-password').focus();
    } catch {
        statusText.textContent = 'Could not reach Singularity Lab. Check your connection and reopen the link from your email.';
        retryLink.hidden = false;
    }
}

form.addEventListener('submit', async event => {
    event.preventDefault();
    if (save.disabled || form.hidden) return;
    const password = document.getElementById('new-password').value;
    if (password !== document.getElementById('confirm-password').value) {
        statusText.textContent = 'The passwords don’t match. Enter them again.';
        document.getElementById('confirm-password').focus();
        return;
    }
    save.disabled = true;
    statusText.textContent = 'Saving…';
    try {
        const { error } = await recoveryClient.auth.updateUser({ password });
        if (error) {
            if (error.status === 401 || error.status === 403) return showInvalidLink();
            throw error;
        }
        form.reset();
        form.hidden = true;
        localStorage.removeItem('login_time');
        statusText.textContent = 'Your password has been updated. You can now sign in with your new password.';
        await recoveryClient.auth.signOut({ scope: 'local' }).catch(() => {});
    } catch (error) {
        statusText.textContent = error.message || 'Could not update your password. Please try again.';
        retryLink.hidden = false;
    } finally {
        save.disabled = false;
    }
});

openRecoveryLink();
