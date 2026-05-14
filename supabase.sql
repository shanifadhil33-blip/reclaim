-- Reclaim — Solo Biller Utility
-- Database Schema (Supabase)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    provider_name TEXT,
    practice_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    npi_number TEXT,
    polar_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'canceled', 'past_due')),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Appeals Table
CREATE TABLE public.appeals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    insurance_company TEXT NOT NULL,
    date_of_service DATE,
    medical_code TEXT NOT NULL,
    denial_code TEXT NOT NULL,
    clinical_notes TEXT NOT NULL,
    patient_account TEXT,
    generated_letter TEXT,
    status TEXT DEFAULT 'pending' NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own appeals" ON public.appeals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own appeals" ON public.appeals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own appeals" ON public.appeals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own appeals" ON public.appeals FOR DELETE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, trial_ends_at)
    VALUES (NEW.id, now() + interval '14 days');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
