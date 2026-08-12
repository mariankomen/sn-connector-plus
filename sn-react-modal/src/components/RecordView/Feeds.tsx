import { useEffect, useState, useCallback } from "react";
import type { IRecordModalProps } from "../../interfaces/IRecordModal";
import styles from "../Feeds.module.css";

interface FeedElement {
    id: string;
    type: string;
    actor: {
        displayName: string;
        photo?: {
            fullEmailPhotoUrl?: string;
        };
    };
    header?: {
        text: string;
    };
    body?: {
        isRichText: boolean;
        text?: string;
        messageSegments?: MessageSegment[];
    };
    capabilities?: {
        caseComment?: {
            text: string;
        };
        comments?: {
            page?: {
                items?: FeedComment[];
            };
        };
        questionAndAnswers?: {
            questionTitle?: string;
        };
    };
    relativeCreatedDate: string;
}

interface FeedComment {
    id: string;
    user: {
        displayName: string;
        photo?: {
            fullEmailPhotoUrl?: string;
        };
    };
    body: {
        isRichText: boolean;
        text?: string;
        messageSegments?: MessageSegment[];
    };
    relativeCreatedDate: string;
}

interface MessageSegment {
    type: string;
    text?: string;
    htmlTag?: string;
    url?: string;
    reference?: {
        id: string;
    };
    record?: {
        id: string;
    };
}

interface ProcessedComment {
    id: string;
    avatar: {
        name: string;
        src?: string;
    };
    author: string;
    time: string;
    body: {
        isRichText: boolean;
        text?: string;
        messageSegments?: MessageSegment[];
    };
}

interface ProcessedFeed {
    id: string;
    avatar: {
        name: string;
        src?: string;
    };
    author: string;
    time: string;
    type: string;
    body: {
        isRichText: boolean;
        text?: string;
        messageSegments?: MessageSegment[];
    };
    comments: ProcessedComment[];
    capabilities?: any;
}

const Feeds = ({ sf_record_id }: IRecordModalProps) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [feeds, setFeeds] = useState<ProcessedFeed[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [instanceUrl, setInstanceUrl] = useState<string>("");
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);

    const fetchFeeds = useCallback(async (recordId: string, nextPageUrl: string = "") => {
        try {
            const url = `/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/get-feed?record_id=${recordId}${nextPageUrl ? `&nextPageUrl=${encodeURIComponent(nextPageUrl)}` : ""}`;
            
            const response = await fetch(url, {
                headers: {
                    "Accept": "application/json",
                    'X-UserToken': window.g_ck || ''
                },
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Failed to fetch feeds");
            }

           
            if (data.instanceUrl) {
                setInstanceUrl(data.instanceUrl);
            }

            
            const elements = data.elements || [];
            const processed = convertFeed(elements);

            if (nextPageUrl) {
              
                setFeeds((prev) => [...prev, ...processed]);
            } else {
            
                setFeeds(processed);
            }

           
            if (data.nextPageToken) {
                setNextPageToken(data.nextPageToken);
            } else {
                setNextPageToken(null);
            }

            setError(null);
        } catch (err: any) {
            console.error("Error fetching feeds:", err);
            setError(err.message || "Failed to load feeds");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (sf_record_id) {
            setLoading(true);
            fetchFeeds(sf_record_id);
        }
    }, [sf_record_id, fetchFeeds]);

    const convertFeed = (feedElements: FeedElement[]): ProcessedFeed[] => {
        const processed: ProcessedFeed[] = [];

        for (const feed of feedElements) {
            if (
                feed.type === "CaseCommentPost" ||
                feed.type === "TextPost" ||
                feed.type === "ContentPost" ||
                feed.type === "QuestionPost"
            ) {
                const processedFeed: ProcessedFeed = {
                    id: feed.id,
                    avatar: {
                        name: feed.actor.displayName,
                        src: feed.actor.photo?.fullEmailPhotoUrl,
                    },
                    author: feed.header?.text || feed.actor.displayName,
                    time: feed.relativeCreatedDate,
                    type: feed.type,
                    capabilities: feed.capabilities,
                    body: {
                        isRichText: false,
                    },
                    comments: [],
                };

                
                if (feed.type === "CaseCommentPost" && feed.capabilities?.caseComment) {
                    processedFeed.body = {
                        isRichText: false,
                        text: feed.capabilities.caseComment.text,
                    };
                } else if (feed.body) {
                    processedFeed.body = feed.body;
                }

                
                if (feed.capabilities?.comments?.page?.items) {
                    for (const comment of feed.capabilities.comments.page.items) {
                        const processedComment: ProcessedComment = {
                            id: comment.id,
                            avatar: {
                                name: comment.user.displayName,
                                src: comment.user.photo?.fullEmailPhotoUrl,
                            },
                            author: comment.user.displayName,
                            time: comment.relativeCreatedDate,
                            body: comment.body,
                        };
                        processedFeed.comments.push(processedComment);
                    }
                }

                processed.push(processedFeed);
            }
        }

        return processed;
    };

    const loadMoreFeeds = () => {
        if (nextPageToken && sf_record_id) {
            setLoading(true);
            fetchFeeds(sf_record_id, nextPageToken);
        }
    };

    const getContent = (data: { body: { isRichText: boolean; text?: string; messageSegments?: MessageSegment[] }; capabilities?: any; type?: string }) => {
        const body = data.body;

        if (!body.isRichText && body.text) {
            let plainText = body.text;
            try {
                plainText = plainText.replaceAll("\r\n", "<br>");
                plainText = plainText.replaceAll("\n", "<br>");
                plainText = `<p>${plainText}</p>`;
            } catch (error) {
                console.error("Error processing plain text:", error);
            }
            return <div dangerouslySetInnerHTML={{ __html: plainText }} />;
        }

        if (body.isRichText && body.messageSegments) {
            let html = "";
            if (data.type === "QuestionPost" && data.capabilities?.questionAndAnswers?.questionTitle) {
                html += `<p><b>${data.capabilities.questionAndAnswers.questionTitle}</b></p>`;
            }

            for (const element of body.messageSegments) {
                if (element.type === "MarkupBegin") {
                    const src = element.url ? ` href="${element.url}" target="_blank"` : "";
                    html += `<${element.htmlTag}${src}>`;
                } else if (element.type === "Text") {
                    html += element.text || "";
                } else if (element.type === "MarkupEnd") {
                    html += `</${element.htmlTag}>`;
                } else if (element.type === "InlineImage") {
                    html += `<p>${element.text || ""}</p>`;
                } else if (element.type === "EntityLink" && element.reference) {
                    const refUrl = instanceUrl ? `${instanceUrl}/${element.reference.id}` : `#${element.reference.id}`;
                    html += `<a href="${refUrl}" target="_blank">${element.text || ""}</a>`;
                } else if (element.type === "Hashtag") {
                    html += `<a>${element.text || ""}</a>`;
                } else if (element.type === "Mention" && element.record) {
                    const mentionUrl = instanceUrl ? `${instanceUrl}/${element.record.id}` : `#${element.record.id}`;
                    html += `<a href="${mentionUrl}" target="_blank">${element.text || ""}</a>`;
                }
            }

            return <div dangerouslySetInnerHTML={{ __html: html || "<p></p>" }} />;
        }

        return <p></p>;
    };

    const getAvatarInitials = (name: string): string => {
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    if (loading && feeds.length === 0) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>Loading feeds...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.errorText}>{error}</p>
            </div>
        );
    }

    if (feeds.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>No feeds available</p>
                <p className={styles.emptyStateHint}>There are no posts or comments for this record yet.</p>
            </div>
        );
    }

    return (
        <div className={styles.feedsContainer}>
            {feeds.map((feed) => (
                <div key={feed.id} className={styles.feedItem}>
                    <div className={styles.feedHeader}>
                        <div className={styles.feedAvatar}>
                            {feed.avatar.src ? (
                                <img src={feed.avatar.src} alt={feed.avatar.name} className={styles.avatarImage} />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    {getAvatarInitials(feed.avatar.name)}
                                </div>
                            )}
                        </div>
                        <div className={styles.feedMeta}>
                            <div className={styles.feedAuthor}>{feed.author}</div>
                            <div className={styles.feedTime}>{feed.time}</div>
                        </div>
                    </div>
                    <div className={styles.feedContent}>{getContent(feed)}</div>

                    {feed.comments.length > 0 && (
                        <div className={styles.commentsSection}>
                            {feed.comments.map((comment) => (
                                <div key={comment.id} className={styles.commentItem}>
                                    <div className={styles.commentHeader}>
                                        <div className={styles.commentAvatar}>
                                            {comment.avatar.src ? (
                                                <img src={comment.avatar.src} alt={comment.avatar.name} className={styles.avatarImage} />
                                            ) : (
                                                <div className={styles.avatarPlaceholder}>
                                                    {getAvatarInitials(comment.avatar.name)}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.commentMeta}>
                                            <div className={styles.commentAuthor}>{comment.author}</div>
                                            <div className={styles.commentTime}>{comment.time}</div>
                                        </div>
                                    </div>
                                    <div className={styles.commentContent}>{getContent(comment)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {nextPageToken && (
                <div className={styles.loadMoreContainer}>
                    <button className={styles.loadMoreButton} onClick={loadMoreFeeds} disabled={loading}>
                        {loading ? (
                            <>
                                <div className={styles.spinner}></div>
                                <span>Loading...</span>
                            </>
                        ) : (
                            "Load More"
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default Feeds;