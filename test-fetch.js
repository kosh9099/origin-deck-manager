const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lyfymejgmffxyixuzyhf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5ZnltZWpnbWZmeHlpeHV6eWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNjMwMzAsImV4cCI6MjA4NDczOTAzMH0.zAM7pJNWATuPLDzK74rT6ArrfaFp5jUh5ovChmiTHqM'
);

async function testFetch() {
  const { data, error, status } = await supabase.from('sailors').select('*');
  console.log("Status:", status);
  if (error) {
    console.error("Fetch Error:", error);
  } else {
    console.log("Fetch Success. Number of sailors:", data ? data.length : 0);
  }
}

testFetch();
