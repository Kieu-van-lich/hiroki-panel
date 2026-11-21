import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ status: 'ok', logged: true }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
