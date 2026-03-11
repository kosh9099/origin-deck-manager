const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lyfymejgmffxyixuzyhf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5ZnltZWpnbWZmeHlpeHV6eWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNjMwMzAsImV4cCI6MjA4NDczOTAzMH0.zAM7pJNWATuPLDzK74rT6ArrfaFp5jUh5ovChmiTHqM'
);

async function testInsert() {
  console.log("Testing insert...");
  // New schema keys based on the refactor: port_name, category
  const { data, error } = await supabase
    .from('trade_boosts')
    .insert([{ port_name: "런던", category: "식료품", start_time: new Date().toISOString() }])
    .select();
    
  if (error) {
    console.error("SUPABASE ERROR:", error);
  } else {
    console.log("INSERT SUCCESS:", data);
  }
}

testInsert();
