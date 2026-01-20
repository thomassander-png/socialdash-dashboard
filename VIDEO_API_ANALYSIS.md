# Video API Analyse - ANDskincare Dezember 2025

## Erkenntnisse aus der API-Antwort:

Die API liefert Posts mit folgenden Typen:
- `type: "video"` - 3 Posts (02.12., 09.12., 22.12.)
- `type: "photo"` - Mehrere Posts
- `type: "album"` - 1 Post (11.12.)

## Video-Posts gefunden:

1. **02.12.2025** - type: "video" (Reel)
   - Message: "Workout geschafft?..."
   - permalink: facebook.com/reel/1166070575230906/

2. **09.12.2025** - type: "video" (Reel)  
   - Message: "The Event-Ready Lift..."
   - permalink: facebook.com/reel/1858303918116401/

3. **22.12.2025** - type: "video" (Reel)
   - Message: "Kleine, leise Momente..."
   - permalink: facebook.com/reel/1179687557705610/

## Problem identifiziert:

Die API liefert `type: "video"` korrekt, ABER:
- Es gibt KEIN `video_views` oder `video_3s_views` Feld in der API-Antwort!
- Die Metriken enthalten nur: reactions_total, comments_total, shares_total, reach, impressions

## Lösung:

Der Report Generator muss Videos anhand des `type` Feldes erkennen (nicht anhand von video_views).
Für die 3-Sekunden-Aufrufe müssen wir die Daten aus der fb_post_metrics Tabelle holen, 
wo das Feld `video_3s_views` gespeichert ist.
