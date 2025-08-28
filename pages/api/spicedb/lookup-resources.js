export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { subject, permission, resourceObjectType } = req.body;

        if (!subject || !permission || !resourceObjectType) {
            return res.status(400).json({
                message: 'Missing required fields: subject, permission, resourceObjectType'
            });
        }

        const spicedbUrl = process.env.SPICEDB_URL || 'http://localhost:8080';
        const token = process.env.SPICEDB_TOKEN || 'somerandomkeyhere';

        const response = await fetch(`${spicedbUrl}/v1/permissions/resources`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                subject,
                permission,
                resourceObjectType
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({
                message: `SpiceDB error: ${errorText}`
            });
        }

        const resources = [];

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let boundary = buffer.lastIndexOf('\n');

            if (boundary !== -1) {
                const chunks = buffer.slice(0, boundary).split('\n');
                buffer = buffer.slice(boundary + 1);

                for (const chunk of chunks) {
                    if (chunk.trim() === '') continue;

                    try {
                        const parsed = JSON.parse(chunk);
                        if (parsed.result && parsed.result.resourceObjectId) {
                            resources.push({
                                resourceObjectId: parsed.result.resourceObjectId,
                                permissionship: parsed.result.permissionship
                            });
                        }
                    } catch (e) {
                        console.error('Failed to parse chunk:', chunk, e);
                    }
                }
            }
        }

        res.status(200).json({ resources });

    } catch (error) {
        console.error('Lookup resources API error:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
}
