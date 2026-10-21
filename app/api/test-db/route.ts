import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    let session = null;
    try {
      session = await auth();
    } catch {
      session = null;
    }
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden: Administrator privileges required" }, { status: 403 });
    }

    // Safe operational connectivity ping
    await prisma.$runCommandRaw({ ping: 1 });
    
    return NextResponse.json({ 
      status: 'ok', 
      database: 'connected'
    });
  } catch (error: any) {
    console.error("Database health check error:", error?.message);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database service unavailable'
    }, { status: 503 });
  }
}

