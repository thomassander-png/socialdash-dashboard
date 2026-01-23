import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import ExcelJS from 'exceljs';

interface PostData {
  post_id: string;
  page_id?: string;
  account_id?: string;
  message: string;
  type: string;
  created_time: Date;
  permalink: string;
  reactions_total?: number;
  comments_total?: number;
  shares_total?: number;
  reach?: number;
  impressions?: number;
  video_3s_views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  plays?: number;
}

// Format date for Excel
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Format number with German locale
function formatNumber(num: number): string {
  return num.toLocaleString('de-DE');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const customer = searchParams.get('customer') || 'all';
  const platform = searchParams.get('platform') || 'all'; // 'facebook', 'instagram', 'all'
  
  const startDate = `${month}-01`;
  const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 1).toISOString().slice(0, 10);
  
  try {
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'famefact Dashboard';
    workbook.created = new Date();
    
    // Style definitions
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A651' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };
    
    const dataStyle: Partial<ExcelJS.Style> = {
      alignment: { vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      }
    };
    
    const totalStyle: Partial<ExcelJS.Style> = {
      font: { bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'medium' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' }
      }
    };

    // Get Facebook posts
    if (platform === 'all' || platform === 'facebook') {
      let fbQuery = `
        SELECT 
          p.post_id, p.page_id, p.message, p.type, p.created_time, p.permalink,
          COALESCE(m.reactions_total, 0) as reactions_total,
          COALESCE(m.comments_total, 0) as comments_total,
          COALESCE(m.shares_total, 0) as shares_total,
          COALESCE(m.reach, 0) as reach,
          COALESCE(m.impressions, 0) as impressions,
          COALESCE(m.video_3s_views, 0) as video_3s_views
        FROM fb_posts p
        LEFT JOIN LATERAL (
          SELECT * FROM fb_post_metrics WHERE post_id = p.post_id ORDER BY snapshot_time DESC LIMIT 1
        ) m ON true
        WHERE p.created_time::date >= $1::date AND p.created_time::date < $2::date
      `;
      
      const fbParams: any[] = [startDate, endDate];
      
      if (customer && customer !== 'all') {
        fbQuery += ` AND p.page_id IN (SELECT ca.account_id FROM customer_accounts ca JOIN customers c ON ca.customer_id = c.customer_id WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($3) AND ca.platform = 'facebook')`;
        fbParams.push(customer);
      }
      
      fbQuery += ` ORDER BY p.created_time ASC`;
      
      const fbPosts = await query<PostData>(fbQuery, fbParams);
      
      // Create Facebook sheet
      const fbSheet = workbook.addWorksheet('Facebook', {
        properties: { tabColor: { argb: 'FF1877F2' } }
      });
      
      // Add title row
      fbSheet.mergeCells('A1:L1');
      const titleCell = fbSheet.getCell('A1');
      titleCell.value = `Facebook Performance Report - ${new Date(startDate).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`;
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF1877F2' } };
      titleCell.alignment = { horizontal: 'center' };
      
      // Add headers
      const fbHeaders = ['Datum', 'Typ', 'Reichweite', 'Impressionen', 'Reaktionen', 'Kommentare', 'Shares', 'Video Views', 'Interaktionen', 'Engagement %', 'Nachricht', 'Link'];
      const headerRow = fbSheet.addRow(fbHeaders);
      headerRow.eachCell((cell) => {
        Object.assign(cell, headerStyle);
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill as ExcelJS.Fill;
        cell.alignment = headerStyle.alignment;
        cell.border = headerStyle.border;
      });
      
      // Add data rows
      let fbTotals = { reach: 0, impressions: 0, reactions: 0, comments: 0, shares: 0, videoViews: 0, interactions: 0 };
      
      fbPosts.forEach((post, index) => {
        const reach = Number(post.reach) || 0;
        const impressions = Number(post.impressions) || 0;
        const reactions = Number(post.reactions_total) || 0;
        const comments = Number(post.comments_total) || 0;
        const shares = Number(post.shares_total) || 0;
        const videoViews = Number(post.video_3s_views) || 0;
        const interactions = reactions + comments + shares;
        const engagement = reach > 0 ? ((interactions / reach) * 100).toFixed(2) + '%' : '0%';
        
        fbTotals.reach += reach;
        fbTotals.impressions += impressions;
        fbTotals.reactions += reactions;
        fbTotals.comments += comments;
        fbTotals.shares += shares;
        fbTotals.videoViews += videoViews;
        fbTotals.interactions += interactions;
        
        const row = fbSheet.addRow([
          formatDate(post.created_time),
          post.type || 'post',
          reach,
          impressions,
          reactions,
          comments,
          shares,
          videoViews,
          interactions,
          engagement,
          (post.message || '').substring(0, 100),
          post.permalink || ''
        ]);
        
        // Alternate row colors
        if (index % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
          });
        }
      });
      
      // Add totals row
      const avgEngagement = fbTotals.reach > 0 ? ((fbTotals.interactions / fbTotals.reach) * 100).toFixed(2) + '%' : '0%';
      const totalsRow = fbSheet.addRow([
        'GESAMT',
        `${fbPosts.length} Posts`,
        fbTotals.reach,
        fbTotals.impressions,
        fbTotals.reactions,
        fbTotals.comments,
        fbTotals.shares,
        fbTotals.videoViews,
        fbTotals.interactions,
        avgEngagement,
        '',
        ''
      ]);
      totalsRow.eachCell((cell) => {
        Object.assign(cell, totalStyle);
        cell.font = totalStyle.font;
        cell.fill = totalStyle.fill as ExcelJS.Fill;
        cell.alignment = totalStyle.alignment;
        cell.border = totalStyle.border;
      });
      
      // Set column widths
      fbSheet.columns = [
        { width: 12 }, // Datum
        { width: 12 }, // Typ
        { width: 12 }, // Reichweite
        { width: 14 }, // Impressionen
        { width: 12 }, // Reaktionen
        { width: 12 }, // Kommentare
        { width: 10 }, // Shares
        { width: 12 }, // Video Views
        { width: 14 }, // Interaktionen
        { width: 14 }, // Engagement
        { width: 50 }, // Nachricht
        { width: 40 }, // Link
      ];
    }

    // Get Instagram posts
    if (platform === 'all' || platform === 'instagram') {
      let igQuery = `
        SELECT 
          p.media_id as post_id, p.account_id, p.caption as message, p.media_type as type,
          p.timestamp as created_time, p.permalink,
          COALESCE(m.likes, 0) as likes,
          COALESCE(m.comments, 0) as comments,
          COALESCE(m.shares, 0) as shares,
          COALESCE(m.saves, 0) as saves,
          COALESCE(m.reach, 0) as reach,
          COALESCE(m.impressions, 0) as impressions,
          COALESCE(m.plays, 0) as plays
        FROM ig_posts p
        LEFT JOIN LATERAL (
          SELECT * FROM ig_post_metrics WHERE media_id = p.media_id ORDER BY snapshot_time DESC LIMIT 1
        ) m ON true
        WHERE p.timestamp::date >= $1::date AND p.timestamp::date < $2::date
      `;
      
      const igParams: any[] = [startDate, endDate];
      
      if (customer && customer !== 'all') {
        igQuery += ` AND p.account_id IN (SELECT ca.account_id FROM customer_accounts ca JOIN customers c ON ca.customer_id = c.customer_id WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($3) AND ca.platform = 'instagram')`;
        igParams.push(customer);
      }
      
      igQuery += ` ORDER BY p.timestamp ASC`;
      
      const igPosts = await query<PostData>(igQuery, igParams);
      
      // Create Instagram sheet
      const igSheet = workbook.addWorksheet('Instagram', {
        properties: { tabColor: { argb: 'FFE1306C' } }
      });
      
      // Add title row
      igSheet.mergeCells('A1:M1');
      const igTitleCell = igSheet.getCell('A1');
      igTitleCell.value = `Instagram Performance Report - ${new Date(startDate).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`;
      igTitleCell.font = { bold: true, size: 16, color: { argb: 'FFE1306C' } };
      igTitleCell.alignment = { horizontal: 'center' };
      
      // Add headers
      const igHeaders = ['Datum', 'Typ', 'Reichweite', 'Impressionen', 'Likes', 'Kommentare', 'Shares', 'Saves', 'Plays', 'Interaktionen', 'Engagement %', 'Caption', 'Link'];
      const igHeaderRow = igSheet.addRow(igHeaders);
      igHeaderRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1306C' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Add data rows
      let igTotals = { reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, plays: 0, interactions: 0 };
      
      igPosts.forEach((post, index) => {
        const reach = Number(post.reach) || 0;
        const impressions = Number(post.impressions) || 0;
        const likes = Number(post.likes) || 0;
        const comments = Number(post.comments) || 0;
        const shares = Number(post.shares) || 0;
        const saves = Number(post.saves) || 0;
        const plays = Number(post.plays) || 0;
        const interactions = likes + comments + saves;
        const engagement = reach > 0 ? ((interactions / reach) * 100).toFixed(2) + '%' : '0%';
        
        igTotals.reach += reach;
        igTotals.impressions += impressions;
        igTotals.likes += likes;
        igTotals.comments += comments;
        igTotals.shares += shares;
        igTotals.saves += saves;
        igTotals.plays += plays;
        igTotals.interactions += interactions;
        
        const row = igSheet.addRow([
          formatDate(post.created_time),
          post.type || 'IMAGE',
          reach,
          impressions,
          likes,
          comments,
          shares,
          saves,
          plays,
          interactions,
          engagement,
          (post.message || '').substring(0, 100),
          post.permalink || ''
        ]);
        
        // Alternate row colors
        if (index % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
          });
        }
      });
      
      // Add totals row
      const igAvgEngagement = igTotals.reach > 0 ? ((igTotals.interactions / igTotals.reach) * 100).toFixed(2) + '%' : '0%';
      const igTotalsRow = igSheet.addRow([
        'GESAMT',
        `${igPosts.length} Posts`,
        igTotals.reach,
        igTotals.impressions,
        igTotals.likes,
        igTotals.comments,
        igTotals.shares,
        igTotals.saves,
        igTotals.plays,
        igTotals.interactions,
        igAvgEngagement,
        '',
        ''
      ]);
      igTotalsRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'medium' },
          left: { style: 'thin' },
          bottom: { style: 'medium' },
          right: { style: 'thin' }
        };
      });
      
      // Set column widths
      igSheet.columns = [
        { width: 12 }, // Datum
        { width: 14 }, // Typ
        { width: 12 }, // Reichweite
        { width: 14 }, // Impressionen
        { width: 10 }, // Likes
        { width: 12 }, // Kommentare
        { width: 10 }, // Shares
        { width: 10 }, // Saves
        { width: 10 }, // Plays
        { width: 14 }, // Interaktionen
        { width: 14 }, // Engagement
        { width: 50 }, // Caption
        { width: 40 }, // Link
      ];
    }

    // Create Summary sheet
    const summarySheet = workbook.addWorksheet('Zusammenfassung', {
      properties: { tabColor: { argb: 'FF00A651' } }
    });
    
    summarySheet.mergeCells('A1:D1');
    const summaryTitle = summarySheet.getCell('A1');
    summaryTitle.value = `Social Media Report - ${new Date(startDate).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`;
    summaryTitle.font = { bold: true, size: 18, color: { argb: 'FF00A651' } };
    summaryTitle.alignment = { horizontal: 'center' };
    
    summarySheet.addRow([]);
    summarySheet.addRow(['Erstellt am:', new Date().toLocaleDateString('de-DE')]);
    summarySheet.addRow(['Kunde:', customer === 'all' ? 'Alle Kunden' : customer]);
    summarySheet.addRow(['Zeitraum:', `${new Date(startDate).toLocaleDateString('de-DE')} - ${new Date(endDate).toLocaleDateString('de-DE')}`]);
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Create filename
    const customerSlug = customer === 'all' ? 'alle' : customer.replace(/\s+/g, '-').toLowerCase();
    const filename = `Social_Media_Report_${customerSlug}_${month}.xlsx`;
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
    
  } catch (error: any) {
    console.error('Excel export error:', error?.message || error);
    return NextResponse.json({ error: 'Excel export failed', details: error?.message }, { status: 500 });
  }
}
