import { NextRequest, NextResponse } from 'next/server';

// API Route to get Instagram Business Account ID from Facebook Page ID
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get('page_id');
  
  if (!pageId) {
    return NextResponse.json({ error: 'page_id parameter required' }, { status: 400 });
  }
  
  const accessToken = process.env.META_ACCESS_TOKEN;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'META_ACCESS_TOKEN not configured' }, { status: 500 });
  }
  
  try {
    // Get Instagram Business Account linked to the Facebook Page
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account,name&access_token=${accessToken}`
    );
    
    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ 
        error: data.error.message,
        page_id: pageId 
      }, { status: 400 });
    }
    
    return NextResponse.json({
      page_id: pageId,
      page_name: data.name,
      instagram_business_account: data.instagram_business_account || null,
      instagram_account_id: data.instagram_business_account?.id || null
    });
    
  } catch (error) {
    console.error('Error fetching Instagram account:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Instagram account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
