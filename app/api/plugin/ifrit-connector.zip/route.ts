/**
 * Plugin Download API Route
 * FSD: app/api/plugin/ifrit-connector.zip/route.ts
 * 
 * Serves the Ifrit Connector WordPress plugin as a downloadable ZIP file.
 */

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
    try {
        // Path to the plugin ZIP in wp-plugin folder
        const pluginPath = join(process.cwd(), 'wp-plugin', 'ifrit-connector.zip');

        if (!existsSync(pluginPath)) {
            // Try alternate path or generate on-the-fly
            return NextResponse.json(
                { error: 'Plugin file not found. Please run: cd wp-plugin && zip -r ifrit-connector.zip ifrit-connector/' },
                { status: 404 }
            );
        }

        const fileBuffer = readFileSync(pluginPath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="ifrit-connector.zip"',
                'Content-Length': fileBuffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('[Plugin Download] Error:', error);
        return NextResponse.json(
            { error: 'Failed to download plugin' },
            { status: 500 }
        );
    }
}
