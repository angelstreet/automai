import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Forward the request to the backend server
    const response = await fetch('http://localhost:5001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to register' },
        { status: response.status }
      );
    }

    // Set the token in a secure HTTP-only cookie
    const headers = new Headers();
    headers.append('Set-Cookie', `token=${data.token}; HttpOnly; Path=/; SameSite=Strict`);

    return NextResponse.json(data, {
      status: 201,
      headers,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 