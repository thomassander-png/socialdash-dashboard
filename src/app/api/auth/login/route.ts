import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email und Passwort erforderlich' },
        { status: 400 }
      );
    }

    // Erstelle Supabase Client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Versuche sich mit Supabase Auth anzumelden
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase auth error:', error);
      return NextResponse.json(
        { error: 'Ungültige Anmeldedaten' },
        { status: 401 }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'Login fehlgeschlagen' },
        { status: 401 }
      );
    }

    // Erstelle Response mit Session-Cookie
    const response = NextResponse.json(
      { 
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        }
      },
      { status: 200 }
    );

    // Speichere Session Token in Cookie
    response.cookies.set('auth-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 Stunden
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
