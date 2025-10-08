import { CricketBarodaTournamentScraper } from './src/platforms/cricket-baroda-tournament-scraper';
import { logger } from './src/logger';

async function debugMatchCardContent() {
    const scraper = new CricketBarodaTournamentScraper();
    const tournamentUrl = 'https://www.cricketbaroda.com/tournament/1500003/Late-Dr.-Mrunalini-Devi-Puar-Womens-T20-Tournament-2025-26';

    logger.info('Starting detailed match card content analysis', {}, 'MatchCardDebug');

    try {
        await scraper.initialize();
        logger.info('Scraper initialized successfully', {}, 'MatchCardDebug');

        // Navigate to tournament page
        await scraper['page']!.goto(tournamentUrl, { waitUntil: 'networkidle2' });
        logger.info('Page loaded, analyzing match card content', {}, 'MatchCardDebug');

        // Extract detailed match card content
        const matchCardData = await scraper['page']!.evaluate(() => {
            const cards = document.querySelectorAll('.match-card');
            const cardDetails: any[] = [];

            cards.forEach((card, index) => {
                const cardText = card.textContent || '';
                const lines = cardText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

                // Get inner HTML to see structure
                const innerHTML = card.innerHTML;

                cardDetails.push({
                    index: index + 1,
                    fullText: cardText,
                    lines: lines,
                    innerHTML: innerHTML.substring(0, 500), // First 500 chars
                    childElements: Array.from(card.children).map(child => ({
                        tagName: child.tagName,
                        className: child.className,
                        textContent: child.textContent?.trim()
                    }))
                });
            });

            return cardDetails;
        });

        console.log('\n🔍 DETAILED MATCH CARD ANALYSIS:');
        console.log('=====================================');

        matchCardData.forEach((card, index) => {
            console.log(`\n📋 MATCH CARD ${index + 1}:`);
            console.log('-------------------');
            console.log(`Full Text: "${card.fullText}"`);
            console.log(`Lines (${card.lines.length}):`, card.lines);
            console.log(`Inner HTML (first 500 chars): "${card.innerHTML}"`);
            console.log('Child Elements:');
            card.childElements.forEach((child, childIndex) => {
                console.log(`  ${childIndex + 1}. ${child.tagName}.${child.className}: "${child.textContent}"`);
            });
        });

        // Try to identify team names manually
        console.log('\n🎯 POTENTIAL TEAM IDENTIFICATION:');
        console.log('==================================');

        const potentialTeams: string[] = [];
        matchCardData.forEach((card, cardIndex) => {
            console.log(`\nCard ${cardIndex + 1} potential teams:`);
            card.lines.forEach((line, lineIndex) => {
                // More sophisticated team detection
                const isScore = /\d+\/\d+|\(\d+\.\d+ Ov\)|\d+ Ov/.test(line);
                const isDate = /\d{1,2} (Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(line);
                const isTime = /\d{1,2}:\d{2} (AM|PM)/.test(line);
                const isResult = /won by|abandoned|cancelled/.test(line);
                const isAction = /VIEW SCORECARD/.test(line);
                const isRound = /Final|Semi|Quarter|Round|Match/.test(line);
                const isVenue = /Ground|Stadium|Academy/.test(line) && !line.includes('Women') && !line.includes('Cricket');

                if (!isScore && !isDate && !isTime && !isResult && !isAction && !isRound && !isVenue &&
                    line.length > 5 && line.length < 80 &&
                    !potentialTeams.includes(line)) {

                    potentialTeams.push(line);
                    console.log(`  ✓ "${line}"`);
                } else {
                    console.log(`  ✗ "${line}" (${isScore ? 'score' : isDate ? 'date' : isTime ? 'time' : isResult ? 'result' : isAction ? 'action' : isRound ? 'round' : isVenue ? 'venue' : 'other'})`);
                }
            });
        });

        console.log('\n🏆 UNIQUE POTENTIAL TEAMS FOUND:');
        console.log('================================');
        [...new Set(potentialTeams)].forEach((team, index) => {
            console.log(`${index + 1}. ${team}`);
        });

        logger.info('Match card content analysis completed', {
            cardsAnalyzed: matchCardData.length,
            potentialTeamsFound: [...new Set(potentialTeams)].length
        }, 'MatchCardDebug');

    } catch (error) {
        logger.error('Match card content analysis failed', error as Error, {}, 'MatchCardDebug');
    } finally {
        await scraper.cleanup();
        logger.info('Scraper cleaned up', {}, 'MatchCardDebug');
    }
}

// Run the debug function
debugMatchCardContent().then(() => {
    console.log('\n✅ Detailed match card analysis completed!');
}).catch(error => {
    console.error('❌ Analysis failed:', error);
});
