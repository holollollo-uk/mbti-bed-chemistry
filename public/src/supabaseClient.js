var supabaseClient = null;
try {
    const supabaseUrl = "https://wfsirxjairtcizgwgogu.supabase.co";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmc2lyeGphaXJ0Y2l6Z3dnb2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTA1MDEsImV4cCI6MjA5MzEyNjUwMX0.kYlafiVNBDFgTnSxB-F4mKwWOR-L3-QfH92Ju9FgnAg";
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
    console.warn('Supabase 초기화 실패:', e);
}
