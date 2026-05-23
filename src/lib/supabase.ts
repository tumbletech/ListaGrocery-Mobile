import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://oyemtlvqtlwpaewvopmf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZW10bHZxdGx3cGFld3ZvcG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTQ0NzEsImV4cCI6MjA5NDY3MDQ3MX0.AhXL-9i60UyfQwqZxM0vZZ0t91InbuPdP_JSL3MPHH0";

export const supabase = createClient(
    supabaseUrl, 
    supabaseAnonKey, 
    {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        },
    }
);