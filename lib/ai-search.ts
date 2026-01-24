/**
 * AI-Powered Natural Language Search for Deceased Persons
 * Uses OpenAI to understand natural language queries and extract search parameters
 */

export interface SearchIntent {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  dateOfDeath?: string;
  yearOfBirth?: number;
  yearOfDeath?: number;
  ageAtDeath?: number;
  gender?: string;
  occupation?: string;
  relationship?: string; // e.g., "grandmother", "father"
  searchQuery: string;
  confidence: number; // 0-1 score of how confident the AI is
}

/**
 * Parse natural language query using OpenAI
 * Examples:
 * - "Where is Maria Santos buried?"
 * - "Find my grandmother who died in 1985"
 * - "Juan dela Cruz, born 1950"
 * - "Search for Jose Rizal the national hero"
 */
export async function parseNaturalLanguageQuery(
  query: string
): Promise<SearchIntent> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Fallback to basic parsing if no API key
    console.warn('OpenAI API key not configured, using basic parsing');
    return fallbackParse(query);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a search query parser for a cemetery management system. Extract structured information from natural language queries about deceased persons.

Extract the following fields if present:
- firstName: person's first name
- lastName: person's last name
- middleName: middle name
- dateOfBirth: full date in YYYY-MM-DD format
- dateOfDeath: full date in YYYY-MM-DD format
- yearOfBirth: just the year if full date not available
- yearOfDeath: just the year if full date not available
- ageAtDeath: age when they died
- gender: male/female
- occupation: their profession
- relationship: family relationship mentioned (e.g., "grandmother", "father", "uncle")

Return ONLY valid JSON with the extracted fields. If uncertain about a field, omit it.
Also include a confidence score (0-1) for how certain you are about the extraction.

Example input: "Where is my grandmother Maria Santos buried in 1985?"
Example output: {"firstName":"Maria","lastName":"Santos","yearOfDeath":1985,"relationship":"grandmother","confidence":0.9}`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return fallbackParse(query);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return fallbackParse(query);
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);
    
    return {
      ...parsed,
      searchQuery: query,
      confidence: parsed.confidence || 0.5,
    };
  } catch (error) {
    console.error('Error parsing query with AI:', error);
    return fallbackParse(query);
  }
}

/**
 * Fallback parsing when AI is not available
 * Uses basic regex and keyword matching
 */
function fallbackParse(query: string): SearchIntent {
  const result: SearchIntent = {
    searchQuery: query,
    confidence: 0.3, // Low confidence for fallback
  };

  // Extract years (4 digits)
  const yearMatch = query.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    // Assume it's year of death unless explicitly stated
    if (query.toLowerCase().includes('born')) {
      result.yearOfBirth = year;
    } else {
      result.yearOfDeath = year;
    }
  }

  // Extract full dates (YYYY-MM-DD or similar formats)
  const dateMatch = query.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (dateMatch) {
    if (query.toLowerCase().includes('born')) {
      result.dateOfBirth = dateMatch[0];
    } else {
      result.dateOfDeath = dateMatch[0];
    }
  }

  // Extract relationships
  const relationships = ['grandmother', 'grandfather', 'mother', 'father', 'sister', 'brother', 'aunt', 'uncle', 'cousin'];
  for (const rel of relationships) {
    if (query.toLowerCase().includes(rel)) {
      result.relationship = rel;
      break;
    }
  }

  // Extract gender
  if (query.toLowerCase().match(/\b(male|man|boy|he|him)\b/)) {
    result.gender = 'male';
  } else if (query.toLowerCase().match(/\b(female|woman|girl|she|her)\b/)) {
    result.gender = 'female';
  }

  // Extract names (simple approach - look for capitalized words)
  const words = query.split(/\s+/);
  const capitalizedWords = words.filter(w => /^[A-Z][a-z]+$/.test(w));
  
  if (capitalizedWords.length >= 2) {
    result.firstName = capitalizedWords[0];
    result.lastName = capitalizedWords[capitalizedWords.length - 1];
    if (capitalizedWords.length > 2) {
      result.middleName = capitalizedWords.slice(1, -1).join(' ');
    }
  } else if (capitalizedWords.length === 1) {
    result.lastName = capitalizedWords[0];
  }

  return result;
}

/**
 * Build SQL query from search intent
 */
export function buildSearchQuery(intent: SearchIntent, cemeteryId?: string) {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 1;

  // Name matching
  if (intent.firstName) {
    conditions.push(`LOWER(d.first_name) LIKE LOWER($${paramCount})`);
    params.push(`%${intent.firstName}%`);
    paramCount++;
  }

  if (intent.lastName) {
    conditions.push(`LOWER(d.last_name) LIKE LOWER($${paramCount})`);
    params.push(`%${intent.lastName}%`);
    paramCount++;
  }

  if (intent.middleName) {
    conditions.push(`LOWER(d.middle_name) LIKE LOWER($${paramCount})`);
    params.push(`%${intent.middleName}%`);
    paramCount++;
  }

  // Date matching
  if (intent.dateOfBirth) {
    conditions.push(`d.date_of_birth = $${paramCount}`);
    params.push(intent.dateOfBirth);
    paramCount++;
  }

  if (intent.dateOfDeath) {
    conditions.push(`d.date_of_death = $${paramCount}`);
    params.push(intent.dateOfDeath);
    paramCount++;
  }

  // Year matching
  if (intent.yearOfBirth) {
    conditions.push(`EXTRACT(YEAR FROM d.date_of_birth) = $${paramCount}`);
    params.push(intent.yearOfBirth);
    paramCount++;
  }

  if (intent.yearOfDeath) {
    conditions.push(`EXTRACT(YEAR FROM d.date_of_death) = $${paramCount}`);
    params.push(intent.yearOfDeath);
    paramCount++;
  }

  // Age matching
  if (intent.ageAtDeath) {
    conditions.push(`d.age_at_death = $${paramCount}`);
    params.push(intent.ageAtDeath);
    paramCount++;
  }

  // Gender matching
  if (intent.gender) {
    conditions.push(`LOWER(d.gender) = LOWER($${paramCount})`);
    params.push(intent.gender);
    paramCount++;
  }

  // Occupation matching
  if (intent.occupation) {
    conditions.push(`LOWER(d.occupation) LIKE LOWER($${paramCount})`);
    params.push(`%${intent.occupation}%`);
    paramCount++;
  }

  // Cemetery filter
  if (cemeteryId) {
    conditions.push(`gp.cemetery_id = $${paramCount}`);
    params.push(cemeteryId);
    paramCount++;
  }

  // If no specific conditions, fall back to general search
  if (conditions.length === 0) {
    const generalSearch = intent.searchQuery.trim();
    conditions.push(`(
      LOWER(d.first_name) LIKE LOWER($${paramCount}) OR
      LOWER(d.last_name) LIKE LOWER($${paramCount}) OR
      LOWER(d.first_name || ' ' || d.last_name) LIKE LOWER($${paramCount}) OR
      LOWER(d.occupation) LIKE LOWER($${paramCount})
    )`);
    params.push(`%${generalSearch}%`);
  }

  const sql = `
    SELECT 
      d.id as deceased_id,
      d.first_name,
      d.last_name,
      d.middle_name,
      d.date_of_birth,
      d.date_of_death,
      d.age_at_death,
      d.gender,
      d.occupation,
      d.biography,
      b.id as burial_id,
      b.burial_date,
      b.position_in_plot,
      b.layer,
      gp.id as plot_id,
      gp.plot_number,
      gp.plot_type,
      gp.status,
      gp.latitude,
      gp.longitude,
      gp.map_coordinates,
      gp.cemetery_id,
      c.name as cemetery_name
    FROM deceased_persons d
    INNER JOIN burials b ON d.id = b.deceased_id
    INNER JOIN grave_plots gp ON b.plot_id = gp.id
    INNER JOIN cemeteries c ON gp.cemetery_id = c.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY d.last_name, d.first_name
    LIMIT 20
  `;

  return { sql, params };
}
