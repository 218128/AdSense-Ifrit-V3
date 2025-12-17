import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PRODUCTION_URL = 'https://api.namecheap.com/xml.response';
const SANDBOX_URL = 'https://api.sandbox.namecheap.com/xml.response';

interface NamecheapParams {
    apiUser: string;
    apiKey: string;
    username: string;
    clientIp: string;
    sandbox?: boolean;
    command: 'getDomains' | 'setDNS';
    domain?: string;  // For setDNS command
}

interface DNSRecord {
    type: 'A' | 'CNAME' | 'MX' | 'TXT' | 'AAAA';
    host: string;
    value: string;
    ttl?: number;
    mxPref?: number;
}

export async function POST(req: NextRequest) {
    try {
        const params: NamecheapParams = await req.json();

        if (!params.apiUser || !params.apiKey || !params.username || !params.clientIp) {
            return NextResponse.json(
                { success: false, error: 'Missing required credentials' },
                { status: 400 }
            );
        }

        switch (params.command) {
            case 'getDomains':
                return handleGetDomains(params);
            case 'setDNS':
                return handleSetDNS(params);
            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid command' },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('Namecheap API error:', error);
        return NextResponse.json(
            { success: false, error: 'Connection failed' },
            { status: 500 }
        );
    }
}

/**
 * Get list of domains from Namecheap
 */
async function handleGetDomains(params: NamecheapParams) {
    const baseUrl = params.sandbox ? SANDBOX_URL : PRODUCTION_URL;
    const url = new URL(baseUrl);
    url.searchParams.append('ApiUser', params.apiUser);
    url.searchParams.append('ApiKey', params.apiKey);
    url.searchParams.append('UserName', params.username);
    url.searchParams.append('ClientIp', params.clientIp);
    url.searchParams.append('Command', 'namecheap.domains.getList');
    url.searchParams.append('PageSize', '100');

    const response = await fetch(url.toString());
    const xmlText = await response.text();

    const errorMatch = xmlText.match(/<Error Number="(\d+)">(.*?)<\/Error>/);
    if (errorMatch) {
        return NextResponse.json({
            success: false,
            error: `Namecheap Error ${errorMatch[1]}: ${errorMatch[2]}`
        });
    }

    const domains = parseDomains(xmlText);

    return NextResponse.json({
        success: true,
        domains,
        count: domains.length
    });
}

/**
 * Set DNS records for a domain to point to Vercel
 * Uses: namecheap.domains.dns.setHosts
 */
async function handleSetDNS(params: NamecheapParams) {
    if (!params.domain) {
        return NextResponse.json(
            { success: false, error: 'Domain is required' },
            { status: 400 }
        );
    }

    // Split domain into SLD and TLD
    const domainParts = params.domain.split('.');
    if (domainParts.length < 2) {
        return NextResponse.json(
            { success: false, error: 'Invalid domain format' },
            { status: 400 }
        );
    }

    // Handle multi-part TLDs like .co.uk, .com.br
    let sld: string;
    let tld: string;

    // Common multi-part TLDs
    const multiPartTLDs = ['co.uk', 'com.br', 'com.au', 'co.nz', 'co.za'];
    const lastTwoParts = domainParts.slice(-2).join('.');

    if (multiPartTLDs.includes(lastTwoParts) && domainParts.length >= 3) {
        sld = domainParts.slice(0, -2).join('.');
        tld = lastTwoParts;
    } else {
        sld = domainParts.slice(0, -1).join('.');
        tld = domainParts[domainParts.length - 1];
    }

    // Vercel DNS records
    const records: DNSRecord[] = [
        { type: 'A', host: '@', value: '76.76.21.21', ttl: 1800 },
        { type: 'CNAME', host: 'www', value: 'cname.vercel-dns.com', ttl: 1800 }
    ];

    const baseUrl = params.sandbox ? SANDBOX_URL : PRODUCTION_URL;
    const url = new URL(baseUrl);
    url.searchParams.append('ApiUser', params.apiUser);
    url.searchParams.append('ApiKey', params.apiKey);
    url.searchParams.append('UserName', params.username);
    url.searchParams.append('ClientIp', params.clientIp);
    url.searchParams.append('Command', 'namecheap.domains.dns.setHosts');
    url.searchParams.append('SLD', sld);
    url.searchParams.append('TLD', tld);

    // Add each DNS record
    records.forEach((record, index) => {
        const i = index + 1;
        url.searchParams.append(`HostName${i}`, record.host);
        url.searchParams.append(`RecordType${i}`, record.type);
        url.searchParams.append(`Address${i}`, record.value);
        url.searchParams.append(`TTL${i}`, String(record.ttl || 1800));
        if (record.type === 'MX' && record.mxPref) {
            url.searchParams.append(`MXPref${i}`, String(record.mxPref));
        }
    });

    console.log('Namecheap setDNS URL:', url.toString().replace(params.apiKey, '***'));

    const response = await fetch(url.toString());
    const xmlText = await response.text();

    console.log('Namecheap setDNS response:', xmlText.substring(0, 500));

    // Check for API errors
    const errorMatch = xmlText.match(/<Error Number="(\d+)">(.*?)<\/Error>/);
    if (errorMatch) {
        return NextResponse.json({
            success: false,
            error: `Namecheap Error ${errorMatch[1]}: ${errorMatch[2]}`
        });
    }

    // Check for success
    const isSuccess = xmlText.includes('IsSuccess="true"') || xmlText.includes('<DomainDNSSetHostsResult');

    return NextResponse.json({
        success: isSuccess,
        message: isSuccess ? `DNS records set for ${params.domain}` : 'DNS update failed',
        records: records.map(r => ({ type: r.type, host: r.host, value: r.value }))
    });
}

function parseDomains(xml: string): Array<{
    name: string;
    expires: string;
    isExpired: boolean;
    autoRenew: boolean;
}> {
    const domains: Array<{
        name: string;
        expires: string;
        isExpired: boolean;
        autoRenew: boolean;
    }> = [];

    const domainRegex = /<Domain\s+([^>]+)\/>/g;
    let match;

    while ((match = domainRegex.exec(xml)) !== null) {
        const attrs = match[1];

        const getAttr = (name: string): string => {
            const attrMatch = attrs.match(new RegExp(`${name}="([^"]+)"`));
            return attrMatch ? attrMatch[1] : '';
        };

        domains.push({
            name: getAttr('Name'),
            expires: getAttr('Expires'),
            isExpired: getAttr('IsExpired') === 'true',
            autoRenew: getAttr('AutoRenew') === 'true'
        });
    }

    return domains;
}
