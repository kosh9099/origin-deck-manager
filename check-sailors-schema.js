const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lyfymejgmffxyixuzyhf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5ZnltZWpnbWZmeHlpeHV6eWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNjMwMzAsImV4cCI6MjA4NDczOTAzMH0.zAM7pJNWATuPLDzK74rT6ArrfaFp5jUh5ovChmiTHqM'
);

async function checkSchema() {
  const { data, error } = await supabase.from('sailors').select('*').limit(1);
  if (error) {
    console.error("Error fetching sailors:", error);
  } else {
    if (data && data.length > 0) {
      console.log("Column names in Supabase 'sailors' table:");
      console.log(Object.keys(data[0]));
    } else {
      console.log("The 'sailors' table is empty. Cannot determine column names automatically from data.");
    }
  }
}

checkSchema();
