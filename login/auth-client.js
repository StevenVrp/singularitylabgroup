// The login and recovery pages must use the same Singularity Lab user pool.
function createLabAuthClient(auth = {}) {
    return supabase.createClient(
        'https://wtfmsmibjktgajegflwp.supabase.co',
        'sb_publishable_ez5qG1v0pPIuvv7FF4x7ew_YuqM7dDJ',
        { auth }
    );
}
