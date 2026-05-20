import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import '../styles/DocumentationPage.css';

const tocSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'search-operators', label: 'Global Search Operators' },
  { id: 'campaign-performance', label: '1. Campaign Performance' },
  { id: 'campaign-analytics', label: '2. Campaign Analytics' },
  { id: 'program-performance', label: '3. Program Performance' },
  { id: 'dashboard-builder', label: '4. Dashboard Builder' },
  { id: 'ab-testing', label: '5. A/B Testing' },
  { id: 'reports-management', label: '6. Reports Management' },
  { id: 'audience-analytics', label: '7. Audience Analytics' },
  { id: 'basis-performance', label: '8. Basis Performance' },
  { id: 'content-performance', label: '9. Content Performance' },
  { id: 'content-analytics', label: '10. Content Analytics' },
  { id: 'cmi-contracts', label: '11. CMI Contracts' },
  { id: 'brand-management', label: '12. Brand Management' },
];

const DocumentationPage = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('overview');
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    const scrollTarget = location.state?.scrollToSection;
    if (scrollTarget) {
      setTimeout(() => {
        const el = document.getElementById(scrollTarget);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.state]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    tocSections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTocOpen(false);
    }
  };

  return (
    <div className="docs-page">
      <button className="docs-toc-mobile-toggle" onClick={() => setTocOpen(!tocOpen)}>
        {tocOpen ? 'Close' : 'Contents'}
      </button>
      <aside className={`docs-toc ${tocOpen ? 'open' : ''}`}>
        <div className="docs-toc-header">Table of Contents</div>
        <nav>
          {tocSections.map(({ id, label }) => (
            <button
              key={id}
              className={`docs-toc-item ${activeSection === id ? 'active' : ''}`}
              onClick={() => scrollTo(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="docs-content">
        <div className="docs-header">
          <div className="docs-header-badge">Technical Documentation</div>
          <h1>Platform Reference Manual</h1>
          <p className="docs-header-subtitle">
            Comprehensive specification of all features, computations, and operational logic within the
            Matrix Medical Communications Campaign Analytics Platform.
          </p>
          <div className="docs-header-meta">
            <span>Version 1.0</span>
            <span className="docs-meta-sep"></span>
            <span>Last Updated: 3/17/2026</span>
          </div>
        </div>


        <section id="overview" className="docs-section">
          <h2>Overview</h2>
          <div className="docs-card">
            <p>
              This document serves as the authoritative reference for all functionality, logic, and computational
              methods employed by the Matrix Medical Communications Campaign Analytics Platform. It is intended
              to provide complete transparency regarding how data is processed, how metrics are derived, and how
              every interactive element within the application operates.
            </p>
            <p>
              The platform is organized into the following modules, each accessible via the sidebar navigation:
            </p>
            <ol className="docs-module-list">
              <li><strong>Campaign Performance</strong> &mdash; View, search, and analyze completed and live email campaign metrics.</li>
              <li><strong>Campaign Analytics</strong> &mdash; Advanced analytics including trends, anomaly detection, benchmarks, timing intelligence, and more.</li>
              <li><strong>Program Performance</strong> &mdash; Unified program bundles with hierarchical attachment across email campaigns, Basis campaigns/brands, YouTube playlists/videos, social channels/posts, publications/issues, and Google Analytics properties/URLs.</li>
              <li><strong>Dashboard Builder</strong> &mdash; Drag-and-drop dashboard creation tool with templates, themes, and export capabilities.</li>
              <li><strong>A/B Testing</strong> &mdash; Automated detection and statistical analysis of A/B test campaigns.</li>
              <li><strong>Reports Management</strong> &mdash; Multi-agency report tracking, metadata management, and JSON generation.</li>
              <li><strong>Audience Analytics</strong> &mdash; User-level querying, NPI lookup, list analysis, shadow engager detection, and engagement pattern detection.</li>
              <li><strong>Basis Performance</strong> &mdash; Programmatic display (DSP) optimization metrics from the Basis platform.</li>
              <li><strong>Content Performance</strong> &mdash; Digital journal, video, and social media content metrics.</li>
              <li><strong>Content Analytics</strong> &mdash; Four main tabs (Walsworth, Google Analytics, YouTube, Social Profiles) each with their own sub-tabs for publication comparison, anomaly detection, device/traffic/geographic/demographic breakdowns, YouTube analytics, and social profile insights.</li>
              <li><strong>CMI Contracts</strong> &mdash; Contract management information for placement tracking.</li>
              <li><strong>Brand Management</strong> &mdash; Brand directory organized by sales team member.</li>
            </ol>
          </div>
        </section>


        <section id="search-operators" className="docs-section">
          <h2>Global Search Operators</h2>
          <div className="docs-card">
            <p>
              The search bar appears on multiple pages throughout the platform (Campaign Performance, Campaign Analytics, etc.).
              In all instances, the search functionality supports two special operators that allow for advanced filtering of results.
              The search is <strong>case-insensitive</strong> in all contexts.
            </p>

            <h3>The <code>&</code> Operator (OR Logic Between Groups)</h3>
            <p>
              The ampersand character (<code>&</code>) is used to separate multiple search conditions. Each condition
              separated by <code>&</code> is evaluated independently, and a result is included if it matches <strong>any one</strong> of the conditions.
              Within each condition, all words must be present (AND logic).
            </p>
            <div className="docs-example">
              <div className="docs-example-label">Example</div>
              <code>oncology & cardiology</code>
              <p>Returns campaigns containing either "oncology" OR "cardiology".</p>
            </div>
            <div className="docs-example">
              <div className="docs-example-label">Example</div>
              <code>cancer vaccine & diabetes treatment</code>
              <p>
                Returns campaigns matching EITHER (both "cancer" AND "vaccine") OR (both "diabetes" AND "treatment").
                All words within a group must appear in the campaign name.
              </p>
            </div>

            <h3>The <code>--</code> Operator (Exclusion / Subtraction)</h3>
            <p>
              The double-dash prefix (<code>--</code>) is used to exclude results containing a specific term.
              Exclusions are processed <em>before</em> inclusion logic, meaning any campaign that contains an excluded
              term is removed regardless of whether it matches the inclusion criteria.
            </p>
            <div className="docs-example">
              <div className="docs-example-label">Example</div>
              <code>pharma --deployment</code>
              <p>Returns all campaigns containing "pharma" that do NOT contain "deployment".</p>
            </div>
            <div className="docs-example">
              <div className="docs-example-label">Example</div>
              <code>cancer & diabetes --trial --phase</code>
              <p>
                Returns campaigns matching "cancer" or "diabetes", but excludes any campaign that contains
                "trial" or "phase". Multiple exclusions can be chained.
              </p>
            </div>

            <h3>Processing Order</h3>
            <div className="docs-steps">
              <div className="docs-step">
                <div className="docs-step-num">1</div>
                <div className="docs-step-text">All <code>--term</code> exclusions are extracted from the search string.</div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">2</div>
                <div className="docs-step-text">If the campaign text contains ANY excluded term, it is immediately filtered out.</div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">3</div>
                <div className="docs-step-text">The remaining search string (without <code>--</code> patterns) is split by <code>&</code> into OR groups.</div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">4</div>
                <div className="docs-step-text">Within each OR group, the string is split by spaces into individual words. ALL words must be present in the campaign name (AND logic).</div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">5</div>
                <div className="docs-step-text">A campaign matches if ANY one of the OR groups fully matches.</div>
              </div>
            </div>
          </div>
        </section>


        <section id="campaign-performance" className="docs-section">
          <h2>1. Campaign Performance</h2>

          <div className="docs-card">
            <h3>Overview</h3>
            <p>
              The Campaign Performance page is the default landing page of the platform. It provides a comprehensive view of all
              email campaign metrics, divided into two primary sections: <strong>Completed Campaign Metrics</strong> (historical data
              dating back to 2010) and <strong>Live Campaign Metrics</strong> (campaigns deployed within the last 14 days that are
              re-evaluated daily).
            </p>
          </div>

          <div className="docs-card">
            <h3>Search Bar</h3>
            <p>
              The search bar at the top of the page filters both the Completed and Live campaign sections simultaneously.
              It supports the <code>&</code> and <code>--</code> operators as described in the
              <button className="docs-inline-link" onClick={() => scrollTo('search-operators')}>Global Search Operators</button> section.
              Search is applied in real-time as the user types.
            </p>
          </div>

          <div className="docs-card">
            <h3>Aggregate Summary Cards</h3>
            <p>
              At the top of the Completed Campaign section, four summary cards display aggregate metrics computed across
              all currently visible (filtered) campaigns. These values update dynamically when the search term or deployment
              filter changes.
            </p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Card</th>
                    <th>Formula</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Unique Open Rate</td>
                    <td><code>(Sum of Unique_Opens / Sum of Delivered) &times; 100</code></td>
                    <td>Weighted aggregate unique open rate across all visible campaigns.</td>
                  </tr>
                  <tr>
                    <td>Total Open Rate</td>
                    <td><code>(Sum of Total_Opens / Sum of Delivered) &times; 100</code></td>
                    <td>Weighted aggregate total open rate across all visible campaigns.</td>
                  </tr>
                  <tr>
                    <td>Unique Click Rate</td>
                    <td><code>(Sum of Unique_Clicks / Sum of Unique_Opens) &times; 100</code></td>
                    <td>Weighted aggregate unique click-to-open rate.</td>
                  </tr>
                  <tr>
                    <td>Total Click Rate</td>
                    <td><code>(Sum of Total_Clicks / Sum of Total_Opens) &times; 100</code></td>
                    <td>Weighted aggregate total click-to-open rate.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="docs-note">
              <strong>Note:</strong> Only campaigns with <code>Delivered &ge; 100</code> are included in all calculations.
              All rate computations use safe division: if the denominator is zero, the rate returns 0%.
            </p>
          </div>

          <div className="docs-card">
            <h3>Completed Campaign Metrics Table</h3>
            <p>
              The table displays historical campaign data sourced from <code>completed_campaign_metrics.json</code> stored in Azure Blob Storage.
              This dataset includes campaigns dating back to 2010 and is updated regularly.
            </p>

            <h4>Data Merging Logic</h4>
            <p>Campaigns undergo a two-level merging process before display:</p>
            <div className="docs-subsection">
              <h5>Level 1: Deployment Merging</h5>
              <p>
                Campaigns that share the same base name but have different deployment numbers (e.g., "Campaign X - Deployment #1",
                "Campaign X - Deployment #2") are merged into a single row. The merging process operates as follows:
              </p>
              <ul>
                <li><strong>Base values (Sent, Delivered, Send_Date)</strong> are taken exclusively from Deployment #1.</li>
                <li><strong>Engagement metrics</strong> (Unique_Opens, Total_Opens, Unique_Clicks, Total_Clicks, Hard_Bounces, Soft_Bounces, Total_Bounces, Filtered_Bot_Clicks) are <strong>summed</strong> across all deployments.</li>
                <li>Deployment #1 is identified by matching patterns: "deployment 1", "deployment #1", or "deployment1" (case-insensitive). If Deployment #1 is not found, the first deployment in the dataset is used as reference.</li>
                <li>The <strong>DeploymentCount</strong> field records how many deployments were merged.</li>
              </ul>
            </div>
            <div className="docs-subsection">
              <h5>Level 2: A/B Group Merging</h5>
              <p>
                After deployment merging, campaigns that differ only by A/B group suffix (e.g., "Campaign X - Group A",
                "Campaign X - Group B") are further merged. All engagement metrics are summed across groups, and base metrics
                (Sent, Delivered) are taken from the first group. The <strong>ABGroupCount</strong> field records the number of groups merged.
              </p>
            </div>

            <h4>Rate Computation (Per Campaign Row)</h4>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Formula</th>
                    <th>Numerator</th>
                    <th>Denominator</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Delivery Rate</td>
                    <td><code>(Delivered / Sent) &times; 100</code></td>
                    <td>Delivered</td>
                    <td>Sent</td>
                  </tr>
                  <tr>
                    <td>Unique Open Rate</td>
                    <td><code>(Unique_Opens / Delivered) &times; 100</code></td>
                    <td>Unique Opens</td>
                    <td>Delivered</td>
                  </tr>
                  <tr>
                    <td>Total Open Rate</td>
                    <td><code>(Total_Opens / Delivered) &times; 100</code></td>
                    <td>Total Opens</td>
                    <td>Delivered</td>
                  </tr>
                  <tr>
                    <td>Unique Click Rate</td>
                    <td><code>(Unique_Clicks / Unique_Opens) &times; 100</code></td>
                    <td>Unique Clicks</td>
                    <td>Unique Opens</td>
                  </tr>
                  <tr>
                    <td>Total Click Rate</td>
                    <td><code>(Total_Clicks / Total_Opens) &times; 100</code></td>
                    <td>Total Clicks</td>
                    <td>Total Opens</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4>Column Selection</h4>
            <p>
              The table displays the Campaign name, Send Date, and four dynamic metric columns. By default, the four columns
              are: Unique Open Rate, Total Open Rate, Unique Click Rate, and Total Click Rate. Users can click on any column
              header to open a dropdown selector with all 15 available metrics:
            </p>
            <ul className="docs-metric-list">
              <li>Sent</li>
              <li>Hard Bounces</li>
              <li>Soft Bounces</li>
              <li>Total Bounces</li>
              <li>Delivered</li>
              <li>Delivery Rate</li>
              <li>Unique Opens</li>
              <li>Unique Open Rate</li>
              <li>Total Opens</li>
              <li>Total Open Rate</li>
              <li>Unique Clicks</li>
              <li>Unique Click Rate</li>
              <li>Total Clicks</li>
              <li>Total Click Rate</li>
              <li>Filtered Bot Clicks</li>
            </ul>

            <h4>Sorting</h4>
            <p>
              <strong>Double-click</strong> on any column header to sort by that column. The first double-click sorts descending;
              a subsequent double-click on the same column toggles to ascending. A sort indicator arrow (&#9650; or &#9660;) appears
              next to the active sort column. The default sort is by <strong>Send Date (descending)</strong>, showing the most recent
              campaigns first.
            </p>

            <h4>Deployment Filter</h4>
            <p>
              A dropdown filter allows selection of a specific deployment view:
            </p>
            <ul>
              <li><strong>All Deployments</strong> &mdash; Shows fully merged data (deployment merging active).</li>
              <li><strong>Deployment 1 / 2 / 3</strong> &mdash; Shows only individual deployment rows matching that number. No merging is applied.</li>
              <li><strong>No Deployment</strong> &mdash; Shows campaigns that have no deployment number in their name.</li>
            </ul>
            <p>
              When a specific deployment is selected, the data is <em>not</em> merged &mdash; each deployment is displayed as an individual row.
            </p>

            <h4>Pagination</h4>
            <p>
              The table paginates results with a configurable number of rows per page. Available options: 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100.
              The default is <strong>10 rows per page</strong>. Pagination controls display up to 5 consecutive page numbers at a time with Previous/Next buttons.
            </p>

            <h4>Export CSV</h4>
            <p>
              The "Export CSV" button downloads all currently filtered and processed campaign data as a CSV file. All columns are included regardless of which four are currently displayed in the table.
            </p>
          </div>

          <div className="docs-card">
            <h3>Campaign Detail Modal</h3>
            <p>
              Clicking any campaign name opens a detailed modal with comprehensive metrics and metadata.
            </p>

            <h4>Core Modal Contents</h4>
            <ul>
              <li><strong>Header:</strong> Campaign name, position indicator ("X of Y"), and a CMI metadata upload button.</li>
              <li><strong>Info Badges:</strong> Send Date and Deployment Count (if more than 1).</li>
              <li><strong>Key Metric Cards (4):</strong> Unique Open Rate, Total Open Rate, Unique Click Rate, Total Click Rate.</li>
              <li><strong>Delivery Statistics Table:</strong> Sent, Delivered, Delivery Rate, Hard Bounces, Soft Bounces, Total Bounces.</li>
              <li><strong>Engagement Statistics Table:</strong> Engagement Rate (Unique_Opens / Sent &times; 100), Unique Opens, Total Opens, Unique Clicks, Total Clicks, Filtered Bot Clicks.</li>
            </ul>

            <h4>Extended Analytics</h4>
            <ul>
              <li><strong>What Was Clicked:</strong> Top links sorted by click count with URL, click count, and percentage of total clicks. Initially shows 5 links with a "Show More" button that reveals 5 additional links per click.</li>
              <li><strong>Device Usage:</strong> Desktop, Mobile, and Unknown percentages.</li>
              <li><strong>Time-Based Open Rates:</strong> 1-hour, 12-hour, and 24-hour open rates.</li>
              <li><strong>Geographic Breakdown:</strong> Five U.S. regions (West, Northeast, Midwest, Southeast, Southwest), each showing audience percentage and open rate as horizontal bars.</li>
              <li><strong>Audience Breakdown:</strong> List of audience segments sorted by percentage of total audience. Shows audience name, audience percentage, open rate, delivered count, and specialty count. Initially shows 8 rows with "Show More" revealing 10 additional rows per click.</li>
            </ul>

            <h4>Multi-Deployment Metadata Combination</h4>
            <p>
              When a campaign has multiple deployments, metadata from each deployment is combined using the following rules:
            </p>
            <ul>
              <li><strong>Time-Based Rates:</strong> Weighted average by unique opens per deployment.</li>
              <li><strong>Audience Breakdown:</strong> Deployment #1's delivered count is used as the base; opens are summed across all deployments.</li>
              <li><strong>Geographic Breakdown:</strong> Same logic as audience breakdown &mdash; Deployment #1 delivered counts, summed opens.</li>
              <li><strong>Device Breakdown:</strong> Weighted average by total opens per deployment.</li>
              <li><strong>What Was Clicked:</strong> Links are aggregated across all deployments; if the same URL appears in multiple deployments, clicks are summed and percentages recalculated.</li>
            </ul>

            <h4>Navigation</h4>
            <p>
              Arrow buttons (&#8592; / &#8594;) allow browsing through campaigns without closing the modal. Keyboard shortcuts are also supported: Left Arrow = previous, Right Arrow = next, Escape = close.
            </p>

            <h4>Upload CMI Contract Data</h4>
            <p>
              The "Upload CMI Contract Data" button in the campaign modal is <strong>not</strong> related to the extended analytics
              displayed within the modal (clicks, geography, audience breakdown, etc.). Those analytics are derived
              from separately processed campaign data. Instead, this function attaches
              <strong> CMI contract reporting metadata</strong> to a campaign so that it appears with the
              correct placement information in the <strong>Reports Management</strong> section.
            </p>
            <p>
              The upload modal accepts three file types and one text field:
            </p>
            <ul>
              <li><strong>Target List:</strong> An Excel file (.xlsx or .xls) containing the target audience list for CMI reporting.</li>
              <li><strong>Tags:</strong> An Excel file (.xlsx or .xls) containing campaign tags for CMI reporting.</li>
              <li><strong>Ad Images:</strong> Multiple PNG or JPG image files associated with the campaign creative.</li>
              <li><strong>CMI Placement ID (optional):</strong> A text input for the CMI placement identifier. This ID links the campaign to its corresponding CMI contract record.</li>
            </ul>
            <p>
              At least one file or a placement ID must be provided to submit. The button text changes from "Upload CMI Contract Data"
              (blue) to "Update CMI Contract Data" (green) once data has been attached to the campaign.
            </p>
            <h4>Target List → Profile Backfill</h4>
            <p>
              When a Target List Excel file is uploaded, the system also extracts every NPI from the file
              and, in a background task, looks them up in <code>universal_profiles</code> and <code>user_profiles</code>.
              For each match, an entry is appended to the profile's <code>target_lists</code> JSON array
              containing <code>campaign_id</code>, <code>campaign_name</code>, <code>target_list_id</code>, and
              <code>attached_at</code>. Re-uploading the same campaign replaces the existing entry rather than
              duplicating. This enables reverse lookup &mdash; "which campaigns has this HCP been targeted by?" &mdash;
              for attribution, frequency-capping, and engagement analysis.
            </p>

            <h4>Target List Breakdown Modal (Recalculate Breakdown)</h4>
            <p>
              The campaign modal shows a "Target List vs Rest of Audience" split. <strong>Target List</strong> is
              every email whose NPI is on the contracted buy file (resolved via <code>user_profiles.npi</code> &rarr; the
              <code>target_lists</code> JSON tag). <strong>Rest of Audience</strong> is everything else &mdash; usually the
              ~18&ndash;25 standing seed accounts (internal <code>@matrixmedcom.com</code> + a couple of HCP QA seeds).
              When Rest of Audience is materially larger than that baseline, two data-quality factors typically explain it:
            </p>
            <ul>
              <li><strong>NULL NPI in <code>user_profiles</code></strong> &mdash; the email was sent (because IQVIA/HLD has the NPI&rarr;email mapping at the ESP), but our user_profile has no NPI to reverse-resolve, so the email looks "rest" even though the underlying HCP was on the buy file.</li>
              <li><strong>Dual-NPI ambiguity</strong> &mdash; the same email legitimately belongs to two different real HCPs (one record we own, one we license). Because <code>user_profiles.email</code> is unique, we can only store one NPI per email; if the buy file targeted the other NPI, the email is misclassified as rest.</li>
            </ul>
            <p>
              To fix these case-by-case without overwriting existing real records, the breakdown SQL UNIONs in the
              <code>target_list_overrides</code> table &mdash; a side table keyed by <code>(email, campaign_id_or_name)</code>
              that records "this email should be counted as targeted for this specific campaign." Inserts happen via the
              external diagnostic tool at
              <code>C:\Users\AndrewDaly\Desktop\P2025\1tools\rest_of_audience_diagnostic\</code>, which cross-references
              the buy file and NPPES per campaign and proposes HIGH-confidence overrides for manual approval. Never used
              to blanket-backfill NPIs.
            </p>
          </div>

          <div className="docs-card">
            <h3>Live Campaign Metrics</h3>
            <p>
              The Live Campaign section displays campaigns that have been deployed within the <strong>last 14 days</strong> and whose
              metrics are refreshed (re-run) on a <strong>daily basis</strong>. This provides near-real-time tracking of ongoing campaign performance.
            </p>

            <h4>Inclusion Criteria</h4>
            <p>
              A deployment is included in the live view if it meets all of the following conditions:
            </p>
            <ul>
              <li><code>Sent &gt; 0</code></li>
              <li><code>Delivered &gt; 20</code></li>
              <li><code>Unique_Opens</code> is not "NA"</li>
            </ul>

            <h4>Merging Logic</h4>
            <p>
              Live campaigns with multiple deployments are merged using the same logic as completed campaigns:
              base metrics (Sent, Delivered, Send_Date) from Deployment #1, engagement metrics summed across all valid deployments.
            </p>

            <h4>Data Validation Flags</h4>
            <p>
              The system fetches validation flags from the backend every 5 minutes. These flags indicate potential discrepancies
              between locally computed metrics and API-reported values. Flags are displayed as follows:
            </p>
            <ul>
              <li><strong>Alert Banner:</strong> Shows total flagged campaigns and severity distribution (HIGH = red, MEDIUM = orange, LOW = blue).</li>
              <li><strong>Campaign Cards:</strong> A warning icon appears on flagged campaigns. The icon color matches the highest severity flag. Hovering reveals a tooltip with flag details including severity, category, local vs. API value, and deviation percentage.</li>
            </ul>
            <p>
              Flags are subject to three filtering rules before display:
            </p>
            <ol>
              <li><strong>Staleness:</strong> Only flags detected within the last 24 hours are shown.</li>
              <li><strong>Deployment Filtering:</strong> "Sent" deviation flags from Deployment #2, #3, etc. are ignored (only Deployment #1 matters).</li>
              <li><strong>Resolution:</strong> Flags are hidden if the deviation between the current metric and the flagged value is less than 1%.</li>
            </ol>

            <h4>Display</h4>
            <p>
              Live campaigns are displayed in a grid layout, 2 per page. Each card shows the campaign name (clickable to open the modal),
              deployment date, deployment count, and a full metrics table. Pagination uses smart ellipsis logic.
            </p>
          </div>
        </section>


        <section id="campaign-analytics" className="docs-section">
          <h2>2. Campaign Analytics</h2>

          <div className="docs-card">
            <h3>Overview</h3>
            <p>
              The Campaign Analytics page provides a suite of advanced analytical tools organized into sub-tabs.
              The search bar at the top applies globally across all sub-tabs and supports the standard
              <code>&</code> and <code>--</code> operators.
            </p>
            <p>Sub-tabs (in order):</p>
            <ul>
              <li>Monthly Trends</li>
              <li>Yearly Trends</li>
              <li>Campaign Benchmarks</li>
              <li>Anomaly Detection</li>
              <li>Subject Lines</li>
              <li>Click Analytics</li>
              <li>Specialty Insights</li>
              <li>Geographic (Campaign Rates / Audience &amp; Market)</li>
              <li>Timing Intelligence</li>
            </ul>
            <p>
              Tabs implement lazy loading: each sub-tab is only rendered once it has been visited, and its state is preserved
              when switching between tabs. A "Clear" button forces a component remount for fresh data.
            </p>
          </div>

          <div className="docs-card">
            <h3>Monthly Trends</h3>
            <p>
              Displays monthly performance trends as a line chart with data points for each month of the year, broken down by selected years.
            </p>

            <h4>Controls</h4>
            <ul>
              <li><strong>Metric Selector:</strong> Choose between Unique Open Rate, Total Open Rate, Unique Click Rate, or Total Click Rate.</li>
              <li><strong>Year Selector:</strong> Multi-select dropdown to include/exclude specific years. At least one year must remain selected. Initially shows the last 5 years.</li>
              <li><strong>Campaign Inclusion/Exclusion:</strong> A "View Campaigns" dropdown shows all campaigns matching the current search. Each campaign has a checkbox. Unchecking a campaign excludes it from chart calculations. An "Include all" button resets exclusions.</li>
            </ul>

            <h4>Data Processing</h4>
            <p>
              Campaigns are filtered to <code>Delivered &ge; 100</code>, grouped by cleaned name (deployment numbers stripped),
              and multi-deployment metrics are summed with Deployment #1 providing the base. Campaigns are then bucketed by month and year.
            </p>
            <h4>Rate Calculations</h4>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>Metric</th><th>Formula</th></tr></thead>
                <tbody>
                  <tr><td>Unique Open Rate</td><td><code>(Sum Unique_Opens / Sum Delivered) &times; 100</code></td></tr>
                  <tr><td>Total Open Rate</td><td><code>(Sum Total_Opens / Sum Delivered) &times; 100</code></td></tr>
                  <tr><td>Unique Click Rate</td><td><code>(Sum Unique_Clicks / Sum Unique_Opens) &times; 100</code></td></tr>
                  <tr><td>Total Click Rate</td><td><code>(Sum Total_Clicks / Sum Total_Opens) &times; 100</code></td></tr>
                </tbody>
              </table>
            </div>

            <h4>Chart Scaling</h4>
            <p>
              The Y-axis auto-scales based on the maximum value in the dataset. Click rate charts use a smaller scale (up to 20),
              while open rate charts use a larger scale (up to 100).
            </p>

            <h4>Month-over-Month Change Matrix</h4>
            <p>
              Below the chart, a matrix shows the percentage change from the prior month for each month/year. January compares
              against the prior year's December. The formula is:
            </p>
            <div className="docs-formula">
              <code>Change % = ((Current Month Value - Prior Month Value) / Prior Month Value) &times; 100</code>
            </div>
            <p>Positive changes display in green with a "+" prefix; negative changes display in red.</p>
          </div>

          <div className="docs-card">
            <h3>Yearly Trends</h3>
            <p>
              Displays year-over-year performance as a bar chart. Supports multi-metric selection (all four rate metrics can be
              toggled simultaneously) and multi-year selection.
            </p>

            <h4>Campaign Inclusion/Exclusion</h4>
            <p>
              Identical to Monthly Trends: after searching, a dropdown allows adding or removing individual campaigns from the
              analysis via checkboxes. This dropdown only appears in the Monthly and Yearly Trends sub-tabs.
            </p>

            <h4>Year-over-Year Summary Table</h4>
            <p>
              A table below the chart displays each year's metrics with delta values showing the change from the prior year.
              Positive deltas are styled in green; negative deltas in red.
            </p>
          </div>

          <div className="docs-card">
            <h3>Campaign Benchmarks</h3>
            <p>
              Compares campaign performance against similar campaigns. This section has two parts: an <strong>aggregate overview
              that loads instantly</strong> (no query required), and an <strong>on-demand per-campaign deep dive</strong>.
            </p>

            <h4>Aggregate Overview (Preloaded)</h4>
            <p>
              Loads automatically on mount from the campaign metrics blob&mdash;no query or campaign selection needed.
              Displays a grid of benchmark data cards grouped by market or content type, with toggles for:
            </p>
            <ul>
              <li><strong>Group by:</strong> Market or Content (determines how campaigns are pooled).</li>
              <li><strong>Filter by:</strong> All or By Disease (hierarchical display with parent groups and children when grouped by disease). In market mode, sub-topics are disease states only&mdash;brand names, abbreviations, and synonyms are consolidated (e.g., GPP + Spevigo + Generalized Pustular Psoriasis all merge). Journals, conferences, and specialty names are excluded.</li>
            </ul>
            <p>
              Each card shows: group name, average open rate, campaign count, and a color-coded delta vs. the overall average
              (green for above, red for below). Groups with many entries support &ldquo;Load More&rdquo; and &ldquo;Collapse&rdquo; controls.
            </p>

            <h4>Per-Campaign Analysis (On-Demand)</h4>
            <p>A searchable dropdown lists all campaigns sorted by most recent send date. Each entry shows the campaign name, open rate, delivered count, and send date.</p>

            <h4>Analysis Configuration</h4>
            <ul>
              <li><strong>Group by:</strong> Content or Market (determines the comparison pool).</li>
              <li><strong>Filter by:</strong> All or By Disease (narrows the comparison pool).</li>
            </ul>

            <h4>Market Classification</h4>
            <p>
              In Market mode the frontend classifies every campaign using a combined map of disease/specialty/brand keywords (<code>src/utils/industryKeywords.js</code>)
              plus the Brand Management table. Both the selected campaign&rsquo;s market and the full peer map are sent to the backend with the request so
              the backend filters peers by exact market match. If a campaign cannot be classified, the response includes a <code>warning</code> field
              surfaced in the UI as &ldquo;This campaign could not be classified into a market. Add its brand in Brand Management or update the campaign name.&rdquo;
            </p>

            <h4>Results</h4>
            <p>After selecting a campaign and clicking &ldquo;Run,&rdquo; three result views are available:</p>
            <ul>
              <li><strong>Performance Score:</strong> Letter grade (A/B/C/D/F) based on percentile ranking, overall score (0-100), and four metric cards showing your value, min/max range, a visual percentile track with position marker, and the median/mean of similar campaigns.</li>
              <li><strong>Similar Campaigns:</strong> Table listing matching campaigns with delta formatting. Positive deltas (where the selected campaign is higher) appear in green; negative deltas in red.</li>
              <li><strong>Percentile Rankings:</strong> Horizontal bars for each metric showing the percentile position with the actual value.</li>
            </ul>
            <p>
              When zero peers are found, the section renders the warning message instead of empty grade cards; when the request fails or times out,
              the error message is shown directly so the user can distinguish &ldquo;no peers&rdquo; from &ldquo;request failed.&rdquo;
            </p>
          </div>

          <div className="docs-card">
            <h3>Anomaly Detection</h3>
            <p>
              Identifies campaigns whose performance significantly deviates from their peer group using <strong>Z-Score analysis</strong>.
            </p>

            <h4>What is a Z-Score?</h4>
            <p>
              A Z-Score is a statistical measurement that describes a value's relationship to the mean of a group of values.
              It is measured in terms of standard deviations from the mean. A Z-Score of 0 indicates the value is exactly at the mean,
              while a Z-Score of -2.0 indicates the value is 2 standard deviations below the mean. In the context of this application,
              Z-Scores are used to identify campaigns that performed significantly better or worse than their peer group average.
            </p>

            <h4>Why Z-Scores Are Used Here</h4>
            <p>
              Z-Scores provide a statistically rigorous way to identify outliers. Rather than using arbitrary thresholds
              (e.g., "below 10% open rate"), Z-Scores account for the natural variation within each group. A campaign with a 12% open rate
              might be anomalous in a group that averages 20%, but perfectly normal in a group that averages 13%.
            </p>

            <h4>Calculation</h4>
            <div className="docs-formula">
              <code>Z-Score = (Campaign Open Rate - Group Mean) / Group Standard Deviation</code>
            </div>
            <p>Where:</p>
            <ul>
              <li><strong>Group Mean</strong> = average Unique Open Rate of all completed campaigns in the same group.</li>
              <li><strong>Standard Deviation</strong> = population standard deviation of the group's open rates.</li>
              <li>Groups must have at least <strong>5 completed campaigns</strong> to generate meaningful statistics.</li>
            </ul>

            <h4>Thresholds</h4>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead>
                  <tr><th>Direction</th><th>Threshold</th><th>Meaning</th></tr>
                </thead>
                <tbody>
                  <tr><td>Underperforming</td><td><code>Z-Score &lt; -1.5</code></td><td>Campaign performs significantly below its group average.</td></tr>
                  <tr><td>Overperforming</td><td><code>Z-Score &gt; 1.5</code></td><td>Campaign performs significantly above its group average.</td></tr>
                </tbody>
              </table>
            </div>

            <h4>Severity Classification</h4>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>|Z-Score|</th><th>Underperforming Label</th><th>Overperforming Label</th></tr></thead>
                <tbody>
                  <tr><td>&gt; 2.5</td><td>Severe</td><td>Exceptional</td></tr>
                  <tr><td>&gt; 2.0</td><td>Moderate</td><td>Strong</td></tr>
                  <tr><td>&ge; 1.5</td><td>Mild</td><td>Notable</td></tr>
                </tbody>
              </table>
            </div>

            <h4>Grouping Modes</h4>
            <ul>
              <li><strong>Group by Content:</strong> Campaigns are classified into buckets (Clinical Updates, Expert Perspectives, Hot Topics, Custom Email) based on regex patterns in campaign names.</li>
              <li><strong>Group by Market:</strong> Campaigns are mapped to market categories using the brand-management database and keyword matching. Sub-topics are <strong>disease states only</strong> &mdash; brand names (e.g., Spevigo), abbreviations (e.g., GPP), and full disease names (e.g., Generalized Pustular Psoriasis) are all consolidated into the canonical disease name. Journals (JCAD), conferences (AAD), and specialties (Oncology) are not shown as sub-topics.</li>
            </ul>

            <h4>Detection Level</h4>
            <ul>
              <li><strong>All (Group-Wide):</strong> Z-Score is calculated across the entire bucket/market group.</li>
              <li><strong>By Disease:</strong> Z-Score is calculated within disease/topic sub-groups, providing finer-grained anomaly detection.</li>
            </ul>

            <h4>Anomaly Card Display</h4>
            <p>Each detected anomaly displays: severity label, bucket/topic, Unique Open Rate, group average, deviation percentage, delivered count, Z-Score, and a Live badge if the campaign is still active.</p>

            <h4>Normal Distribution Modal</h4>
            <p>
              Clicking any anomaly card opens an interactive modal that visualizes the statistical distribution of the
              entire peer group, placing the selected campaign in context against all other campaigns in its group.
            </p>

            <div className="docs-subsection">
              <h5>Header</h5>
              <p>
                Displays the group label (e.g., "Clinical Updates &middot; Diabetes" when analyzing by disease, or just
                the bucket name otherwise), along with three summary statistics: campaign count in the group,
                mean (&mu;) as a percentage, and standard deviation (&sigma;) as a percentage.
              </p>
            </div>

            <div className="docs-subsection">
              <h5>Bell Curve Visualization</h5>
              <p>
                The modal renders an SVG chart (720&times;380px) showing a normal distribution bell curve derived from
                the group's mean and standard deviation. Key elements of the chart:
              </p>
              <ul>
                <li><strong>Bell curve:</strong> Cyan-colored curve with gradient fill representing the expected normal distribution of open rates.</li>
                <li><strong>Shaded tail zones:</strong> A red zone on the left tail marks the underperforming region (below -1.5&sigma;); a green zone on the right tail marks the overperforming region (above +1.5&sigma;).</li>
                <li><strong>Threshold lines:</strong> Dashed vertical lines at -1.5&sigma; (red) and +1.5&sigma; (green) indicating the anomaly detection cutoffs.</li>
                <li><strong>Mean line:</strong> A dashed white vertical line at the mean (&mu;).</li>
                <li><strong>Sigma scale:</strong> The X-axis displays tick marks at -3&sigma;, -2&sigma;, -1&sigma;, &mu;, +1&sigma;, +2&sigma;, +3&sigma;, each labeled with both the sigma notation and the corresponding actual percentage value.</li>
              </ul>
            </div>

            <div className="docs-subsection">
              <h5>Campaign Data Points</h5>
              <p>
                Every campaign in the group is plotted as a dot on the chart at its actual open rate position:
              </p>
              <ul>
                <li><strong>Red dots:</strong> Underperforming campaigns (Z-Score below -1.5).</li>
                <li><strong>Green dots:</strong> Overperforming campaigns (Z-Score above +1.5).</li>
                <li><strong>White/gray dots:</strong> Campaigns within normal range.</li>
                <li><strong>Selected campaign:</strong> Highlighted as a large cyan circle with a glow effect and a vertical connector line from the baseline. Its open rate is displayed as a label above the dot.</li>
              </ul>
              <p>
                Hovering over any non-selected dot displays a tooltip with the campaign name, open rate, and a "LIVE" badge
                if the campaign is currently active.
              </p>
            </div>

            <div className="docs-subsection">
              <h5>Selected Campaign Detail Bar</h5>
              <p>
                At the bottom of the modal, a detail bar shows the selected campaign's name along with its
                Unique Open Rate, Z-Score (formatted with +/- sign), and deviation from the group mean as a percentage.
              </p>
            </div>

            <p>
              The modal can be closed by clicking the X button, pressing Escape, or clicking the overlay outside the modal.
              If the group's standard deviation is zero, the chart cannot be rendered and a message is displayed instead.
            </p>
          </div>

          <div className="docs-card">
            <h3>Subject Line Analysis</h3>
            <p>
              Deep analysis of email subject lines to identify actionable patterns that correlate with higher open rates.
            </p>

            <h4>Analysis Methods</h4>
            <div className="docs-subsection">
              <h5>Subject Anatomy</h5>
              <ul>
                <li><strong>Character length:</strong> Equal 15-character bins (1&ndash;15, 16&ndash;30, 31&ndash;45, 46&ndash;60, 61&ndash;75, 76+). Sweet spot highlighted.</li>
                <li><strong>Readability:</strong> Average word length in equal 1-character bins (&lt;4, 4&ndash;5, 5&ndash;6, 6&ndash;7, 7&ndash;8, 8+). Sweet spot highlighted.</li>
                <li><strong>Structural traits:</strong> Action verb opener, urgency words, question mark, em/en dash, parenthetical, trademark symbols, ALL CAPS words, colon separator, numbers/stats. Each trait shows its impact in percentage points vs baseline.</li>
                <li><strong>Word count:</strong> Individual word counts (e.g. 3, 4, 5&hellip;) with open rate for each. Dynamic range based on data. Sweet spot highlighted.</li>
              </ul>
              <p>Focuses purely on subject line craft&mdash;how the subject is written&mdash;not on content type or disease topic, since those reflect audience engagement rather than subject line effectiveness.</p>
            </div>

            <h4>Sections (Single Scroll View)</h4>
            <ul>
              <li><strong>Subject Line Anatomy:</strong> 2-column grid of insight cards&mdash;Character Length, Readability, Structure Impact, and Word Count&mdash;each with mini bar charts and sweet-spot callouts.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Click Analytics</h3>
            <p>
              Domain-level click analysis with smart categorization&mdash;understanding WHERE clicks go rather than listing raw URLs.
              Every clicked domain is auto-classified into one of nine categories: Ad Network / Tracking, Sponsor / Brand,
              Editorial / Content (our properties), External Education (third-party medical/academic), Conferences,
              Social Media, Podcasts, Email Infrastructure, or Other.
            </p>
            <h4>Data Processing</h4>
            <p>
              Link data is extracted from campaign metadata (<code>what_was_clicked</code> field). For multi-deployment campaigns,
              clicks for the same URL are summed across deployments. Domains are extracted via <code>new URL(link.url).hostname</code> and
              classified using pattern matching on hostname against known ad networks, pharma brand names, social platforms,
              editorial publishers, and email infrastructure domains.
            </p>

            <h4>Layout (single scroll, no tabs)</h4>
            <ul>
              <li><strong>Header Bar:</strong> Title plus stats&mdash;Total Clicks, Unique Domains, Bot Clicks Removed.</li>
              <li><strong>Click Distribution Summary:</strong> Row of color-coded category cards. Each card shows category name (with color dot), total clicks, percentage of all clicks, and domain count.</li>
              <li><strong>Domains by Category:</strong> Collapsible groups per category (all expanded by default). Each group header shows category name, total clicks, and domain count. Inside: domain rows sorted by clicks with inline bar chart and click count.</li>
              <li><strong>Key Insights:</strong> Auto-generated takeaway cards&mdash;ad/tracking click share, sponsor brand engagement level, editorial-vs-ad click ratio, and top domain by traffic share.</li>
            </ul>

            <h4>Domain Categories</h4>
            <ul>
              <li><strong>Ad Network / Tracking:</strong> DoubleClick, AdButler, Google Ads, Criteo, Taboola, Outbrain, plus domains starting with ad., ads., track., pixel., click., trk.</li>
              <li><strong>Sponsor / Brand:</strong> Pharma drug brand names (Verzenio, Tagrisso, Skyrizi, Keytruda, Zoryve, Skinbetter, etc.) and pharma company domains (Lilly, AstraZeneca, Abbvie, J&amp;J, BI, Exelixis, Arcutis, Incyte, Sun Pharma, Castle Biosciences, BMS).</li>
              <li><strong>Editorial / Content:</strong> Our internal properties only&mdash;JCAD, Consultant360, mydigitalpublication.com subdomains, Matrix Medical Communications sites, Oncology Matrix, Nutrition Health Review, Bariatric Times, InnovationsCNS.</li>
              <li><strong>External Education:</strong> Third-party medical/academic content&mdash;medical publishers (PubMed, NEJM, The Lancet, BMJ, Wiley, Springer, Elsevier, Nature, Frontiers, PLOS, LWW), medical news (Healio, MedicalXpress, ScienceDaily, Medscape, MDEdge, HCPLive, NeurologyLive, NCCN), medical organizations (ASCO, ASH, AAN, AAD, AHA, FDA, CDC, WHO), and any .edu domain.</li>
              <li><strong>Conferences:</strong> Conference platforms (EventScribe, Confex, Secure-Platform, Cvent, Cloud-CME) and specific conferences (SABCS, Maui Derm, CNS Summit, SAGES, WCN, CTAD, AAIC, EULAR, IASLC, Masterclasses in Dermatology, DermNPPA, JADP Live, GRC, ESOT Congress, Science of Skin Summit, plus conference-specific subdomains of ASCO/ASH/AAD).</li>
              <li><strong>Social Media:</strong> Facebook, Instagram, X (exact match to avoid false positives), LinkedIn, YouTube, TikTok, Threads, Pinterest.</li>
              <li><strong>Podcasts:</strong> Spotify and Apple Podcasts links.</li>
              <li><strong>Email Infrastructure:</strong> ActiveCampaign domains (emlnk, acemlna, activehosted), BEE template builder, Proofpoint URL defense, unsubscribe/preference links.</li>
              <li><strong>Other:</strong> Fallback for genuinely uncategorized domains (video players, investor relations, Zoom events, misc).</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Specialty Insights</h3>
            <p>
              Analyzes campaign performance segmented by medical specialty using a diverging split layout.
            </p>

            <h4>Configuration</h4>
            <ul>
              <li><strong>Group by:</strong> Content (bucket) or Market.</li>
              <li><strong>Filter by:</strong> All or By Topic. In market mode, topics are disease states only&mdash;brand names, abbreviations, and synonyms are consolidated into canonical disease names. Journals, conferences, and specialty names map to &ldquo;Other.&rdquo;</li>
              <li><strong>Merge Toggle:</strong> When enabled, sub-specialties are combined (e.g., "Dermatology - Cosmetic" and "Dermatology - Medical" merge into "Dermatology").</li>
            </ul>

            <h4>Rate Computation</h4>
            <p>
              Open rates per specialty are computed using Deployment #1's delivered count as the denominator and the sum of
              all deployments' opens as the numerator. Group averages are calculated as weighted averages:
            </p>
            <div className="docs-formula">
              <code>Group Avg Rate = Sum(rate &times; delivered for each specialty) / Sum(delivered)</code>
            </div>

            <h4>Display</h4>
            <p>
              Each group shows specialties as a grid of cards (5 per row), ranked by unique open rate descending.
              Each card displays the rank, specialty name, open rate, deviation from group average (green if above, amber if below),
              and delivered volume. The initial view shows the top 5 specialties per group, with a "Show more" button
              that loads 10 additional specialties at a time. Groups are sorted by total delivered volume (descending).
            </p>
          </div>

          <div className="docs-card">
            <h3>Geographic</h3>
            <p>
              One tab with two subviews toggled by buttons at the top: <strong>Campaign Rates</strong> (open/click rates by state and region)
              and <strong>Audience &amp; Market</strong> (where the audience lives vs the total NPI market, penetration, opportunity).
            </p>

            <h4>Subview: Campaign Rates</h4>

            <h5>Regional Breakdown (Preloaded)</h5>
            <p>
              Loads instantly from the campaign metadata blob&mdash;no database query required. Displays two elements:
            </p>
            <ul>
              <li><strong>Region Cards:</strong> 5 cards (Northeast, Southeast, Midwest, Southwest, West) each showing average open rate, pp deviation from overall average, delivered volume, and audience percentage.</li>
              <li><strong>Interactive SVG Map:</strong> A color-coded U.S. map with regions shaded by performance. A toggle switches the map between <strong>Open Rate</strong> and <strong>Audience %</strong> views. Regions are color-gradient coded (higher values receive more intense coloring). Hovering over a region displays a tooltip with the region name and metric value.</li>
            </ul>

            <h5>State Map &amp; Rankings (On-Demand)</h5>
            <p>
              Clicking "Generate Map &amp; State Rates" queries the database for state-level unique open rates and click rates.
              Displays an interactive color-coded US map and state ranking cards (5 per row, 10 initially,
              "Show more" loads 10 at a time with collapse button).
            </p>
            <ul>
              <li><strong>Metric Toggle:</strong> Unique Open Rate, Total Open Rate, Unique Click Rate, or Total Click Rate — controls map and state cards.</li>
            </ul>
            <h5>Rate Calculations (Per State)</h5>
            <div className="docs-formula">
              <code>Unique Open Rate = (Unique_Opens / Sent) &times; 100</code><br/>
              <code>Total Open Rate = (Total_Opens / Sent) &times; 100</code><br/>
              <code>Unique Click Rate = (Unique_Clicks / Unique_Opens) &times; 100</code><br/>
              <code>Total Click Rate = (Total_Clicks / Total_Opens) &times; 100</code>
            </div>

            <h4>Subview: Audience &amp; Market</h4>
            <p>
              Hits <code>/api/analytics/geographic-main</code> to produce a full owned+licensed-vs-total-market view.
              Tab and section labels read <strong>Owned/Licensed vs Market</strong> rather than &ldquo;Audience vs Market&rdquo; to keep terminology consistent with the rest of the app.
              The endpoint has a 60s statement timeout and returns structured errors the frontend surfaces with a Retry button
              (instead of silently showing empty tiles). Tabs inside the subview include:
            </p>
            <ul>
              <li><strong>Owned + Licensed vs Total Market:</strong> Two state heatmaps side-by-side &mdash; audience users (owned + licensed combined; the precomputed dataset is not yet split by source) per state and active NPIs per state &mdash; with count/penetration color-mode toggle.</li>
              <li><strong>Metro &amp; Urban/Rural:</strong> Top metro areas (New York, LA, Chicago, etc.) with audience count, NPI count, engagement rate, and penetration rate, plus urban/suburban/rural distribution for audience vs NPIs.</li>
              <li><strong>Custom Map:</strong> Filters by specialty, campaign, engagement (all / opened / never_opened), date range, and granularity (state / ZIP prefix / city). The &ldquo;Never Opened&rdquo; option uses a <code>NOT&nbsp;EXISTS</code> anti-join against <code>campaign_interactions</code>, not a Python set-diff. Map and summary regenerate on &ldquo;Generate Map.&rdquo;</li>
            </ul>
            <h5>Key Calculations</h5>
            <div className="docs-formula">
              <code>Penetration Rate = (Audience Users / Active NPIs) &times; 100</code><br/>
              <code>Opportunity Score = 100 &minus; Penetration Rate</code><br/>
              <code>Addressable NPIs = max(0, NPI count &minus; Audience count)</code><br/>
              <code>Engagement Rate = (Engaged Users / Audience Users) &times; 100</code>
            </div>
          </div>

          <div className="docs-card">
            <h3>Timing Intelligence</h3>
            <p>
              Analyzes engagement velocity using precomputed metrics from campaign metadata. Uses brand-name matching (via the Brand Management table)
              to group campaigns by market and compare engagement velocity across industries.
            </p>

            <h4>Section 1: Preloaded Overview (Auto-loads)</h4>
            <p>Loads instantly from precomputed metrics (dashboard_metrics.json) &mdash; no backend query required.</p>
            <div className="docs-subsection">
              <h5>Day of Week Performance</h5>
              <p>Dual mini-bar chart showing 1-hour and 12-hour open rates for each day (Mon&ndash;Sun). Highlights the &ldquo;sweet spot&rdquo; day (highest 1-hr rate with &ge;3 campaigns). Includes weekday vs. weekend 1-hr rate comparison callout.</p>
            </div>
            <div className="docs-subsection">
              <h5>Auto Insights</h5>
              <p>2&times;2 grid: Best send day, average 1-hr open rate, median time to open, and weekday vs. weekend difference (in percentage points).</p>
            </div>
            <div className="docs-subsection">
              <h5>Engagement Velocity by Market</h5>
              <p>Full-width table showing engagement velocity at 1-hour, 6-hour, 12-hour, and 24-hour milestones. Includes an &ldquo;Overall&rdquo; row plus per-market rows (top 6 markets with &ge;5 campaigns). Markets are determined by brand-name matching against the Brand Management table.</p>
            </div>

            <h4>Section 2: Full Analysis (On-Demand)</h4>
            <p>
              Filter bar with Date Range, Campaign Selector, and Specialty Selector, plus a &ldquo;Generate Analysis&rdquo; button.
              Runs one backend query against <code>campaign_interactions</code> (~17.5M rows) using <code>COUNT(*) FILTER (WHERE event_type = ...)</code> in a single pass instead of multiple CTE scans.
              Date Range defaults to last 6 months; the &ldquo;All Time&rdquo; option caps at 12 months server-side to prevent runaway scans.
              <code>user_profiles</code> and <code>campaign_deployments</code> joins only attach when a specialty or campaign filter is actually supplied.
              A 60s statement timeout + a 90s client-side AbortController return a structured error (shown in the UI with a Retry button) instead of a silent spinner-disappear.
            </p>
            <div className="docs-subsection">
              <h5>Hour &times; Day Heatmap</h5>
              <p>A 7-day by 24-hour grid (168 cells) with two modes:</p>
              <ul>
                <li><strong>Opens Mode:</strong> Percentage of total opens at each hour/day.</li>
                <li><strong>Sends Mode:</strong> Percentage of total sends at each hour/day.</li>
              </ul>
            </div>
            <div className="docs-subsection">
              <h5>Day of Week Bars</h5>
              <p>Horizontal bars for each day showing percentage of total opens.</p>
            </div>
            <div className="docs-subsection">
              <h5>Time to Open Distribution</h5>
              <p>Histogram of time-to-first-open buckets with summary cards (Median Time to Open, Peak Engagement Window, Opens Within 24h).</p>
            </div>

            <h4>Methodology</h4>
            <div className="docs-formula">
              <code>Precomputed 1/6/12/24-hr open rates per campaign from metadata JSON</code><br/>
              <code>Day of week derived from campaign send_date</code><br/>
              <code>Market assignment via brand-name matching (Brand Management table)</code>
            </div>
          </div>
        </section>

        <section id="program-performance" className="docs-section">
          <h2>3. Program Performance</h2>

          <div className="docs-card">
            <h3>Overview</h3>
            <p>
              Program Performance is a comprehensive program management system that lets users bundle campaigns, brands, videos,
              social posts, publications, and web analytics into unified &ldquo;programs.&rdquo; Each program is a named collection of items
              from across multiple channels&mdash;email campaigns, Basis campaigns/brands, YouTube playlists/videos, Facebook/Instagram/LinkedIn
              channels/posts, Walsworth publications/issues, and Google Analytics properties/URLs&mdash;all organized under one consolidated view.
              Programs can optionally contain <strong>sub-programs</strong>, allowing hierarchical grouping (e.g., a &ldquo;Spevigo 2026&rdquo;
              program with sub-programs for &ldquo;Expert Perspectives,&rdquo; &ldquo;Clinical Updates,&rdquo; and &ldquo;Custom Email&rdquo;).
              No new data is created; all metrics are pulled live from existing data sources and aggregated automatically.
            </p>
          </div>

          <div className="docs-card">
            <h3>Page Layout &amp; Navigation</h3>
            <p>The page is structured as follows:</p>
            <ul>
              <li><strong>Header:</strong> Title (&ldquo;Program Performance&rdquo;) and a search input that filters programs by name or market/description.</li>
              <li><strong>Tab Bar:</strong> Two tabs&mdash;<strong>Active Programs</strong> and <strong>Completed Programs</strong>&mdash;each showing a count of programs in that status. A <strong>&ldquo;+ Create Program&rdquo;</strong> button sits to the right of the tabs.</li>
              <li><strong>Content Area:</strong> Displays a vertical list of Program Cards for the selected tab, filtered by the search term. If no programs exist, an empty state with a gear icon and &ldquo;Create Your First Program&rdquo; button is shown.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Data Sources</h3>
            <p>
              On mount, the page fetches nine data sources in parallel from Azure Blob Storage, plus the programs list from the backend API:
            </p>
            <ul>
              <li><strong>Email:</strong> <code>completed_campaign_metrics.json</code> &mdash; deployment-merged with the same logic used in Campaign Performance (campaigns grouped by name after stripping &ldquo;Deployment #N&rdquo; suffixes; metrics summed; rates recalculated; filtered to Delivered &ge; 100).</li>
              <li><strong>YouTube:</strong> <code>youtube_metrics.json</code> &mdash; playlists and individual videos with views, watch time, and average percentage watched.</li>
              <li><strong>Vimeo:</strong> <code>vimeo_metrics.json</code></li>
              <li><strong>Facebook:</strong> <code>facebook_profile_metrics.json</code> and <code>facebook_engagement_metrics.json</code> &mdash; merged by company key.</li>
              <li><strong>Instagram:</strong> <code>instagram_profile_metrics.json</code> and <code>instagram_engagement_metrics.json</code> &mdash; merged by company key.</li>
              <li><strong>Publications:</strong> <code>walsworth_metrics.json</code> &mdash; Walsworth online journal publications and issues.</li>
              <li><strong>Google Analytics:</strong> <code>google_analytics_metrics.json</code> &mdash; properties and URLs with user counts, durations, bounce rates.</li>
            </ul>
            <p>
              Items are matched to live data by identifier. If a matching record is not found for an item, it still appears in the program but displays dashes instead of metrics.
            </p>
          </div>

          <div className="docs-card">
            <h3>Program Bundles</h3>
            <p>
              A program is a named collection of items from across multiple channels. Each program has a <strong>name</strong>, optional
              <strong> market/description</strong> (e.g., Oncology, Dermatology), and <strong>status</strong> (Active or Completed).
              Programs are stored in the backend database and persist across sessions.
            </p>
            <h4>Hierarchical Attachment Model</h4>
            <p>
              Each data source supports multi-level attachment. Selecting at the parent level means all current children are automatically included:
            </p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Parent Level</th>
                    <th>Child Level</th>
                    <th>Aggregated Metrics</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Email</td>
                    <td>&mdash;</td>
                    <td>Campaign (deployments merged)</td>
                    <td>Sent, Delivered, Open Rates, Click Rates</td>
                  </tr>
                  <tr>
                    <td>Basis</td>
                    <td>Brand (all campaigns auto-included)</td>
                    <td>Individual Campaign</td>
                    <td>Impressions, Clicks, Spend, CTR</td>
                  </tr>
                  <tr>
                    <td>YouTube</td>
                    <td>Playlist (all videos auto-included)</td>
                    <td>Individual Video</td>
                    <td>Views, Watch Time, Avg % Watched</td>
                  </tr>
                  <tr>
                    <td>Social Media</td>
                    <td>Channel (all posts auto-included)</td>
                    <td>Individual Post (FB or IG)</td>
                    <td>Impressions/Reach, Engagements, Engagement Rate</td>
                  </tr>
                  <tr>
                    <td>Publications</td>
                    <td>Publication (all issues auto-included)</td>
                    <td>Individual Issue</td>
                    <td>Page Views, Unique Views, Issue Visits</td>
                  </tr>
                  <tr>
                    <td>Google Analytics</td>
                    <td>Property (all URLs auto-included)</td>
                    <td>Individual URL</td>
                    <td>Users, Avg Duration, Bounce Rate</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="docs-card">
            <h3>Creating a Program &mdash; 8-Step Wizard</h3>
            <p>
              Click &ldquo;Create Program&rdquo; to open a full-screen modal wizard. The wizard consists of 8 steps,
              each represented by a step indicator at the top of the modal. Step indicators show the step number by default,
              but display the <strong>selected item count</strong> instead when items have been chosen for that step.
              Indicators turn <strong>green</strong> when items are selected in that category. On screens below 900px, step labels
              are hidden and only numbers are shown.
            </p>
            <div className="docs-steps">
              <div className="docs-step">
                <div className="docs-step-num">1</div>
                <div className="docs-step-text">
                  <strong>Program Info:</strong> Enter the program name (required) and optional market/description. The market field
                  is a dropdown populated from the same markets API used in A/B Testing. The program name is critical because it
                  drives the smart recommendation engine in all subsequent steps. A <strong>&ldquo;This program has sub-programs&rdquo;</strong> checkbox
                  allows you to organize items into named sub-programs instead of a flat list. When enabled, the wizard switches to a two-step
                  flow (Info &rarr; Sub-Program Hub) instead of the standard 8-step channel-by-channel flow.
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">2</div>
                <div className="docs-step-text">
                  <strong>Email Campaigns:</strong> Searchable list of all email campaigns (deployment-merged, Delivered &ge; 100).
                  Items are sorted by relevance to the program name. Each entry shows the campaign name and delivered count.
                  Matching items display a &ldquo;match&rdquo; badge. The list is capped at 200 results.
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">3</div>
                <div className="docs-step-text">
                  <strong>Basis:</strong> Hierarchical view&mdash;brands are shown as expandable groups with their campaigns nested inside.
                  Selecting a brand auto-includes all campaigns under it. You can expand a brand to select individual campaigns instead.
                  Each brand entry shows campaign count and aggregate impressions/spend. Includes &ldquo;Select All&rdquo; / &ldquo;Deselect All&rdquo;
                  buttons for filtered results.
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">4</div>
                <div className="docs-step-text">
                  <strong>YouTube:</strong> Playlists shown as expandable groups with their videos. Select at playlist level (all videos
                  auto-included) or expand to pick individual videos. Each playlist shows video count; each video shows views and published date.
                  Smart matching scores playlists by relevance to the program name.
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">5</div>
                <div className="docs-step-text">
                  <strong>Social Media:</strong> Facebook and Instagram channels as expandable groups. Select at channel level (all posts
                  included) or expand to pick individual posts. Posts show text (truncated), impressions, and engagements. Limited to 50 posts
                  per channel in the selection list.
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">6</div>
                <div className="docs-step-text">
                  <strong>Publications:</strong> Walsworth publications as expandable groups with their issues. Select at publication level
                  (all issues included) or expand to pick individual issues. Each issue shows page view counts.
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">7</div>
                <div className="docs-step-text">
                  <strong>Google Analytics:</strong> Properties as expandable groups with their URLs. Select at property level (all URLs included)
                  or expand to pick individual URLs. Each URL shows user count and bounce rate. Limited to 50 URLs per property in the selection list.
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">8</div>
                <div className="docs-step-text">
                  <strong>Review &amp; Save:</strong> Summary of all selected items grouped by type. Each item can be removed individually via
                  an &ldquo;X&rdquo; button. Shows total item count. The &ldquo;Create Program&rdquo; (or &ldquo;Save Program&rdquo; when editing)
                  button is disabled until a program name has been entered.
                </div>
              </div>
            </div>
            <p>
              Every step (2&ndash;7) is optional&mdash;skip any step by clicking <strong>Next</strong> or use the
              <strong> &ldquo;Skip to Review&rdquo;</strong> button to jump directly to step 8. Each step has its own search bar
              (cleared when switching steps), and the toolbar shows a selection count badge in cyan. A recommendation banner at the
              top reads &ldquo;Items sorted by relevance to [program name]&rdquo; when the program name is set.
            </p>

            <h4>Smart Recommendations</h4>
            <p>
              The program name is used to automatically score and sort items by relevance across all steps. The scoring algorithm
              (<code>scoreMatch</code>) expands common medical abbreviations to their full forms before matching:
            </p>
            <ul>
              <li>NSCLC &rarr; Non-Small Cell Lung Cancer</li>
              <li>SCLC &rarr; Small Cell Lung Cancer</li>
              <li>RCC &rarr; Renal Cell Carcinoma</li>
              <li>GPP &rarr; Generalized Pustular Psoriasis</li>
              <li>AD &rarr; Atopic Dermatitis</li>
              <li>HS &rarr; Hidradenitis Suppurativa</li>
              <li>MBC &rarr; Metastatic Breast Cancer</li>
              <li>COPD &rarr; Chronic Obstructive Pulmonary Disease</li>
              <li>IBD &rarr; Inflammatory Bowel Disease</li>
              <li>And more (HT, ICNS, etc.)</li>
            </ul>
            <p>
              The algorithm expands abbreviations in both the program name and the item name, then scores word overlap between the two.
              Items are sorted by descending relevance score, and matching items are highlighted with a &ldquo;match&rdquo; badge.
            </p>

            <h4>Edit Mode</h4>
            <p>
              Clicking &ldquo;Edit Program&rdquo; on an existing program card opens the same wizard pre-filled with the program&rsquo;s
              current name, market, and selected items. All previously selected items appear pre-checked. The final step button reads
              &ldquo;Save Program&rdquo; instead of &ldquo;Create Program.&rdquo;
            </p>

            <h4>Sub-Programs</h4>
            <p>
              When &ldquo;This program has sub-programs&rdquo; is checked on the Info step, the wizard switches to a <strong>hub-based flow</strong>:
            </p>
            <ul>
              <li><strong>Step 1 &mdash; Program Info:</strong> Same as above, but with the sub-programs toggle checked.</li>
              <li><strong>Step 2 &mdash; Sub-Program Hub:</strong> Shows a list of all sub-programs added so far, each as a card displaying the sub-program name, item count, and type breakdown. Includes &ldquo;Edit&rdquo; and &ldquo;Remove&rdquo; buttons per card, and a &ldquo;+ Add Sub-Program&rdquo; button to add new ones.</li>
            </ul>
            <p>
              Clicking &ldquo;+ Add Sub-Program&rdquo; (or &ldquo;Edit&rdquo; on an existing card) opens a <strong>7-step mini-wizard</strong> within the same modal:
            </p>
            <ul>
              <li><strong>Name:</strong> Enter the sub-program name (e.g., &ldquo;Expert Perspectives&rdquo;).</li>
              <li><strong>Steps 2&ndash;7:</strong> The same Email, Basis, YouTube, Social Media, Publications, and Google Analytics steps as the flat flow, but selections are scoped to this sub-program only.</li>
            </ul>
            <p>
              After saving a sub-program, the user returns to the hub. The &ldquo;Create Program&rdquo; button on the hub saves the entire program with all sub-programs.
              Each sub-program&rsquo;s items are stored with a <code>sub_program_id</code> linking them to their sub-program.
            </p>
            <p>
              <strong>Toggling behavior:</strong> Switching from sub-programs to flat mode warns if sub-programs exist (they will be removed). Switching from flat to sub-programs warns if items are already selected (they will be cleared).
            </p>
          </div>

          <div className="docs-card">
            <h3>Program Card &mdash; Collapsed View</h3>
            <p>
              Each program is displayed as an expandable card. The collapsed header shows:
            </p>
            <ul>
              <li>The <strong>program name</strong> (clickable to expand).</li>
              <li><strong>Channel badges:</strong> Colored badges for each channel that has items, showing the item count (e.g., &ldquo;3&rdquo; for 3 email campaigns). Only channels with at least one item are shown.</li>
              <li><strong>Status badge:</strong> &ldquo;Active&rdquo; or &ldquo;Completed&rdquo; with distinct styling.</li>
              <li>An <strong>expand/collapse arrow</strong> icon.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Program Card &mdash; Expanded View</h3>
            <p>When expanded, the card reveals a rich set of controls and data sections:</p>

            <h4>Meta Row</h4>
            <ul>
              <li><strong>Market / Notes:</strong> An editable text area displaying the program&rsquo;s description/market. Changes <strong>auto-save on blur</strong> &mdash; simply click away after editing and the value is persisted to the backend without pressing a save button.</li>
              <li><strong>Status Dropdown:</strong> A dropdown to switch between &ldquo;Active&rdquo; and &ldquo;Completed.&rdquo; Changes <strong>auto-save on change</strong> &mdash; selecting a new status immediately persists to the backend. Changing status to &ldquo;Completed&rdquo; moves the program to the Completed tab.</li>
            </ul>

            <h4>Summary Bar</h4>
            <p>
              Displays the total item count and channel count (e.g., &ldquo;12 items across 4 channels&rdquo;), plus two action buttons:
              <strong> Edit Program</strong> (opens the wizard in edit mode) and <strong>Delete</strong> (removes the program after confirmation).
            </p>

            <h4>Channel Sections (Flat Programs)</h4>
            <p>
              For flat programs (no sub-programs), each channel that has items is rendered as a <strong>collapsible section</strong>. Each section header
              displays the channel name, inline aggregate statistics, and a chevron toggle. Clicking the header expands or collapses the
              section&rsquo;s data table.
            </p>

            <h4>Sub-Program Display</h4>
            <p>
              For programs with sub-programs, the expanded card shows:
            </p>
            <ul>
              <li><strong>Program Totals banner:</strong> An aggregate summary across ALL sub-programs combined, showing key metrics from each channel present (emails delivered, open/click rates, impressions, spend, video views, engagements, page views, users).</li>
              <li><strong>Sub-program accordions:</strong> Each sub-program is displayed as a collapsible section with a purple left border accent. The header shows the sub-program name, item count, and channel badges. Expanding a sub-program reveals the same channel sections (Email, Basis, YouTube, etc.) scoped to that sub-program&rsquo;s items only.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Channel Sections &mdash; Detail Tables &amp; Aggregates</h3>
            <p>
              Each channel section contains a data table showing per-item metrics. The section header displays aggregate statistics
              calculated across all items in that channel. Below are the columns and aggregation formulas for each channel.
            </p>

            <h4>Email Campaigns</h4>
            <p><strong>Section header aggregates:</strong> total Sent (sum), total Delivered (sum), Unique Open Rate (average across campaigns), Total Open Rate (average), Unique Click Rate (average), Total Click Rate (average).</p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>Column</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td>Campaign</td><td>Deployment-merged campaign name</td></tr>
                  <tr><td>Sent</td><td>Total recipients sent to</td></tr>
                  <tr><td>Delivered</td><td>Total successfully delivered</td></tr>
                  <tr><td>U. Open</td><td>Unique Open Rate (%)</td></tr>
                  <tr><td>T. Open</td><td>Total Open Rate (%)</td></tr>
                  <tr><td>U. Click</td><td>Unique Click Rate (%)</td></tr>
                  <tr><td>T. Click</td><td>Total Click Rate (%)</td></tr>
                </tbody>
              </table>
            </div>

            <h4>Basis Campaigns</h4>
            <p><strong>Section header aggregates:</strong> total Impressions (sum), total Clicks (sum), total Spend (sum, currency-formatted).</p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>Column</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td>Campaign</td><td>Basis campaign name</td></tr>
                  <tr><td>Brand</td><td>Associated brand name</td></tr>
                  <tr><td>Impressions</td><td>Total impressions served</td></tr>
                  <tr><td>Clicks</td><td>Total clicks received</td></tr>
                  <tr><td>Spend</td><td>Total spend (currency-formatted)</td></tr>
                </tbody>
              </table>
            </div>

            <h4>Basis Brands</h4>
            <p><strong>Section header aggregates:</strong> total Impressions (sum across all campaigns in brand), total Clicks (sum), total Spend (sum), CTR = (total Clicks / total Impressions) &times; 100.</p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>Column</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td>Campaign</td><td>Campaign name (within the brand)</td></tr>
                  <tr><td>Impressions</td><td>Campaign-level impressions</td></tr>
                  <tr><td>Clicks</td><td>Campaign-level clicks</td></tr>
                  <tr><td>Spend</td><td>Campaign-level spend (currency-formatted)</td></tr>
                  <tr><td>CTR</td><td>Click-through rate (%)</td></tr>
                </tbody>
              </table>
            </div>

            <h4>YouTube</h4>
            <p><strong>Section header aggregates:</strong> total Videos (count from playlists + standalone), total Views (sum), total Watch Time (sum of hours, formatted as &ldquo;Xh&rdquo; or &ldquo;Xm&rdquo;).</p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>Column</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td>Video</td><td>Video title</td></tr>
                  <tr><td>Views</td><td>Total view count</td></tr>
                  <tr><td>Watch Time</td><td>Total watch time (formatted)</td></tr>
                  <tr><td>Avg View %</td><td>Average percentage of video watched</td></tr>
                </tbody>
              </table>
            </div>

            <h4>Social Media</h4>
            <p><strong>Section header aggregates:</strong> total Posts (count), total Impressions (sum of reach for IG, impressions for FB), total Engagements (sum of interactions), Engagement Rate = (Engagements / Impressions) &times; 100.</p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>Column</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td>Name</td><td>Post text (truncated) or channel name</td></tr>
                  <tr><td>Impressions</td><td>Impressions (FB) or Reach (IG)</td></tr>
                  <tr><td>Engagements</td><td>Total interactions (likes, comments, shares)</td></tr>
                  <tr><td>Eng. Rate</td><td>Engagement rate (%)</td></tr>
                </tbody>
              </table>
            </div>

            <h4>Publications</h4>
            <p><strong>Section header aggregates:</strong> total Issues (count), total Page Views (sum), total Unique Views (sum).</p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>Column</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td>Issue</td><td>Issue name or publication name</td></tr>
                  <tr><td>Page Views</td><td>Total page views for the issue</td></tr>
                  <tr><td>Unique Views</td><td>Unique page views</td></tr>
                  <tr><td>Visits</td><td>Total issue visits</td></tr>
                </tbody>
              </table>
            </div>

            <h4>Google Analytics</h4>
            <p><strong>Section header aggregates:</strong> total URLs (count), total Users (sum).</p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>Column</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td>URL / Title</td><td>Page URL or title</td></tr>
                  <tr><td>Users</td><td>Total unique users</td></tr>
                  <tr><td>Avg Duration</td><td>Average session duration (formatted as M:SS)</td></tr>
                  <tr><td>Bounce Rate</td><td>Bounce rate (%)</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="docs-card">
            <h3>Number Formatting</h3>
            <p>Metrics in Program Performance are formatted using the following conventions:</p>
            <ul>
              <li><strong>Counts:</strong> Comma-separated (e.g., &ldquo;1,234,567&rdquo;).</li>
              <li><strong>Percentages:</strong> Two decimal places with &ldquo;%&rdquo; suffix (e.g., &ldquo;45.67%&rdquo;).</li>
              <li><strong>Currency:</strong> Dollar sign with comma-separated format (e.g., &ldquo;$1,234.56&rdquo;).</li>
              <li><strong>Durations:</strong> Formatted as &ldquo;M:SS&rdquo; for session times (e.g., &ldquo;2:45&rdquo;).</li>
              <li><strong>Watch Time:</strong> Formatted as &ldquo;Xh&rdquo; for hours or &ldquo;Xm&rdquo; for minutes (e.g., &ldquo;1.5h&rdquo; or &ldquo;30m&rdquo;).</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>API Endpoints</h3>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Endpoint</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>GET</td>
                    <td><code>/api/programs/</code></td>
                    <td>List all programs with their items.</td>
                  </tr>
                  <tr>
                    <td>POST</td>
                    <td><code>/api/programs/</code></td>
                    <td>Create a new program with name, market, and items array.</td>
                  </tr>
                  <tr>
                    <td>PUT</td>
                    <td><code>/api/programs/:id</code></td>
                    <td>Update program name, market/description, status, or replace items.</td>
                  </tr>
                  <tr>
                    <td>DELETE</td>
                    <td><code>/api/programs/:id</code></td>
                    <td>Delete a program and all its items.</td>
                  </tr>
                  <tr>
                    <td>POST</td>
                    <td><code>/api/programs/:id/items</code></td>
                    <td>Add items to an existing program.</td>
                  </tr>
                  <tr>
                    <td>DELETE</td>
                    <td><code>/api/programs/:id/items/:item_id</code></td>
                    <td>Remove a single item from a program.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="docs-card">
            <h3>Badge Color Legend</h3>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Badge Color</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Email Campaigns</td><td>Cyan</td></tr>
                  <tr><td>Basis (Campaigns &amp; Brands)</td><td>Blue</td></tr>
                  <tr><td>YouTube (Playlists &amp; Videos)</td><td>Purple</td></tr>
                  <tr><td>Social Media (Channels &amp; Posts)</td><td>Green</td></tr>
                  <tr><td>Publications (Publications &amp; Issues)</td><td>Orange</td></tr>
                  <tr><td>Google Analytics (Properties &amp; URLs)</td><td>Pink</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="docs-card">
            <h3>Database Schema</h3>
            <p>Programs are persisted in three backend tables:</p>
            <div className="docs-subsection">
              <h5>Programs Table</h5>
              <ul>
                <li><code>id</code> &mdash; Primary key (auto-increment).</li>
                <li><code>name</code> &mdash; Program name (required, up to 500 characters).</li>
                <li><code>description</code> &mdash; Market/notes text field.</li>
                <li><code>status</code> &mdash; &ldquo;active&rdquo; or &ldquo;completed&rdquo; (default: &ldquo;active&rdquo;).</li>
                <li><code>has_sub_programs</code> &mdash; Boolean flag indicating whether the program uses sub-programs (default: false).</li>
                <li><code>created_at</code> / <code>updated_at</code> &mdash; Timestamps.</li>
              </ul>
            </div>
            <div className="docs-subsection">
              <h5>Sub-Programs Table</h5>
              <ul>
                <li><code>id</code> &mdash; Primary key (auto-increment).</li>
                <li><code>program_id</code> &mdash; Foreign key to programs table (indexed).</li>
                <li><code>name</code> &mdash; Sub-program name (e.g., &ldquo;Expert Perspectives&rdquo;).</li>
                <li><code>sort_order</code> &mdash; Display order within the program.</li>
                <li><code>created_at</code> &mdash; Timestamp.</li>
              </ul>
            </div>
            <div className="docs-subsection">
              <h5>Program Items Table</h5>
              <ul>
                <li><code>id</code> &mdash; Primary key (auto-increment).</li>
                <li><code>program_id</code> &mdash; Foreign key to programs table (indexed).</li>
                <li><code>sub_program_id</code> &mdash; Nullable foreign key to sub_programs table. NULL for flat programs; set for items belonging to a sub-program.</li>
                <li><code>item_type</code> &mdash; One of: <code>email_campaign</code>, <code>basis_brand</code>, <code>basis_campaign</code>, <code>youtube_playlist</code>, <code>youtube_video</code>, <code>social_channel</code>, <code>facebook_post</code>, <code>instagram_post</code>, <code>linkedin_post</code>, <code>walsworth_publication</code>, <code>walsworth_issue</code>, <code>ga_property</code>, <code>ga_url</code>.</li>
                <li><code>item_identifier</code> &mdash; Unique identifier for the item (name, ID, or URL depending on type).</li>
                <li><code>item_label</code> &mdash; Human-readable display label.</li>
                <li><code>created_at</code> &mdash; Timestamp when item was added.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="dashboard-builder" className="docs-section">
          <h2>4. Dashboard Builder</h2>

          <div className="docs-card">
            <h3>Overview</h3>
            <p>
              The Dashboard Builder is a full-featured drag-and-drop dashboard creation tool that allows users to design custom
              campaign performance dashboards. Dashboards can be populated with live campaign data, styled with themes, and exported
              as PDF files. The canvas is fixed at <strong>1024 &times; 576 pixels</strong>.
            </p>
          </div>

          <div className="docs-card">
            <h3>Template Selection Wizard</h3>
            <p>Creating a new dashboard begins with a 4-step wizard:</p>
            <div className="docs-steps">
              <div className="docs-step">
                <div className="docs-step-num">1</div>
                <div className="docs-step-text">
                  <strong>Choose Theme:</strong> Select from 6 available color themes: JCAD (teal), Oncology (blue), ICNS (indigo),
                  NPPA (purple), Matrix (gray/navy), NHR (navy). Each theme defines a complete color palette including primary,
                  secondary, accent, surface, gradient, and utility colors.
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">2</div>
                <div className="docs-step-text">
                  <strong>Campaign Type:</strong> Choose Single Campaign or Multi Campaign (up to 8 campaigns).
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">3</div>
                <div className="docs-step-text">
                  <strong>Select Campaign(s):</strong> A searchable list of all campaigns with checkboxes. Each entry shows the campaign name and delivered count.
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">4</div>
                <div className="docs-step-text">
                  <strong>Choose Layout:</strong> A 3&times;2 grid of template previews. Templates include: Base metrics only, Base + 1/2/3 tables,
                  Hot Topics variant, Expert Perspectives variant. A "Recommended" badge highlights the best-fit template. "Generate Dashboard" applies the selection.
                </div>
              </div>
            </div>
          </div>

          <div className="docs-card">
            <h3>Component Types</h3>
            <p>The following component types can be placed on the canvas:</p>

            <div className="docs-subsection">
              <h5>Metric Card</h5>
              <p>
                Displays a single metric value with a title and subtitle. Three variants: Hero (large, 2&times;2 grid), Secondary (medium, 2&times;1),
                and Metric (standard, 1&times;1). Supports inline editing via double-click, with Tab navigation between title, value, and subtitle fields.
                Drag with 8px grid snap. Resize with minimum 50&times;30px.
              </p>
            </div>

            <div className="docs-subsection">
              <h5>Cost Comparison Card</h5>
              <p>
                Compares contracted cost vs. actual cost. Four display modes:
              </p>
              <ul>
                <li><strong>Side-by-Side:</strong> Two columns with a vertical divider.</li>
                <li><strong>Percentage:</strong> Large percentage display with budget comparison.</li>
                <li><strong>Stacked:</strong> Vertical list format.</li>
                <li><strong>Gauge:</strong> Circular/bar progress visualization.</li>
              </ul>
              <p>Calculations: Savings = Contracted - Actual; Efficiency = (Actual / Contracted) &times; 100%.</p>
            </div>

            <div className="docs-subsection">
              <h5>Title Component</h5>
              <p>Large campaign title with responsive font sizing (18-32px). Supports text gradient styling and inline editing.</p>
            </div>

            <div className="docs-subsection">
              <h5>Specialty KPI Strips</h5>
              <p>
                A 2-column grid of specialty performance cards. Each strip shows: specialty name, engagement rate (color-coded),
                audience share percentage, performance delta with trend icon (&#8599; green for up, &#8600; red for down), and engaged count.
              </p>
            </div>

            <div className="docs-subsection">
              <h5>Stat Highlight</h5>
              <p>Compact card with a colored accent left border (6px). Displays title, value, and subtitle. Minimum size: 100&times;50px.</p>
            </div>

            <div className="docs-subsection">
              <h5>Metric Strip</h5>
              <p>Horizontal strip displaying multiple metrics with dividers. Two variants: Hero (dark background) and Standard. Supports editing of label/value pairs.</p>
            </div>

            <div className="docs-subsection">
              <h5>Image Slot</h5>
              <p>Placeholder for images with dashed border. Supports labels and icon types (video, journal, social, image).</p>
            </div>
          </div>

          <div className="docs-card">
            <h3>Component Sidebar</h3>
            <p>
              The sidebar on the right side of the canvas is the primary control panel for configuring the dashboard. It contains four tabs,
              each accessible via icon buttons at the top of the sidebar. The sidebar is <strong>context-aware</strong>&mdash;controls appear
              and disappear dynamically based on what tables and components are currently on the canvas.
            </p>
          </div>

          <div className="docs-card">
            <h3>Sidebar &mdash; Controls Tab</h3>
            <p>The Controls tab contains global dashboard settings and template-specific controls that appear conditionally.</p>

            <h4>Table Row &amp; Column Operations</h4>
            <p>
              When a table cell or row is selected on the canvas, a <strong>Cell Selected</strong> or <strong>Row Selected</strong> panel
              appears at the top of the Controls tab with the following operations:
            </p>
            <ul>
              <li><strong>Add Row Below:</strong> Inserts a new empty row beneath the currently selected row.</li>
              <li><strong>Delete Row:</strong> Removes the currently selected row from the table.</li>
              <li><strong>Add Column Right:</strong> Inserts a new column to the right of the selected cell (only visible when a specific cell is selected, not just a row).</li>
              <li><strong>Delete Column:</strong> Removes the column containing the selected cell (only visible when a specific cell is selected).</li>
            </ul>

            <h4>Theme Selector</h4>
            <p>
              A dropdown that changes the entire dashboard color scheme. Selecting a theme recolors all components&mdash;cards, gradients,
              borders, text, and specialty strips&mdash;to match the chosen palette. Six themes are available: JCAD, Oncology, ICNS, NPPA, Matrix, and NHR.
            </p>

            <h4>Cost Comparison Mode</h4>
            <p>
              Available on all templates <em>except</em> Hot Topics and Expert Perspectives. Provides a dropdown with five options:
              <strong>None</strong> (hides cost display), <strong>Side-by-Side</strong> (budgeted vs. actual in two columns),
              <strong>Progress Gauge</strong> (circular gauge showing budget utilization), <strong>Compact Stacked</strong> (vertical stacked bars),
              and <strong>Percentage Focus</strong> (highlights budget utilization as a percentage). When any mode other than None is selected,
              two additional inputs appear: <strong>Budgeted Cost ($)</strong> and <strong>Actual Cost ($)</strong>, both accepting decimal values.
            </p>

            <h4>Show Total Sends</h4>
            <p>Toggle checkbox (hidden on Hot Topics / Expert Perspectives templates). When enabled, displays aggregate send volume metrics on the dashboard.</p>

            <h4>Show Date</h4>
            <p>Toggle checkbox that only appears for multi-campaign templates. When enabled, inserts a <strong>Send Date</strong> column into the campaign comparison table, formatted as M/D/YY (e.g., 3/4/26).</p>

            <h4>Campaign Comparison Table &mdash; Name Deduplication</h4>
            <p>
              The first column of the multi-campaign comparison table automatically strips common prefix/suffix tokens across the selected campaigns so only the unique portion of each name is shown per row. Parenthesized groups (e.g., <code>(Target List)</code>) are treated atomically and never split. When a version-tag anchor such as <code>eNL</code> precedes the differing segment, it is re-prepended to the row label.
              The column header adapts to the content: <strong>Campaign Month</strong> if all stripped labels are month names, <strong>Campaign</strong> if any stripping occurred, otherwise <strong>Campaign Name</strong>.
            </p>

            <h4>Campaign Comparison Table &mdash; Row Order</h4>
            <p>
              Rows are sorted by <code>send_date</code> ascending &mdash; the <strong>first-deployed campaign appears at the top</strong>, with later deployments below it. This applies to all multi-campaign templates (Hot Topics Multi, Expert Perspectives Multi, and the generic Multi None/One/Two/Three layouts).
            </p>

            <h4>Merge Subspecialties</h4>
            <p>
              Toggle checkbox. When enabled, all subspecialty data is combined into parent specialties (grouping by the text before the first dash
              in the specialty name). Performance metrics are recalculated as weighted averages. Useful for cleaner specialty-level reporting
              when subspecialty granularity is not needed.
            </p>

            <h4>Banner Impressions</h4>
            <p>Toggle checkbox (hidden on Hot Topics / Expert Perspectives templates). When enabled, replaces the Total Professional Engagements card with eNewsletter Banner Impressions, calculated as Total Opens &times; 2. Expert Perspectives and Custom Email campaigns are not doubled (banner impressions = Total Opens).</p>

            <h4>Logo Toggles</h4>
            <ul>
              <li><strong>Show Pharma Logo:</strong> Displays the active brand/pharma company logo. The logo source is determined automatically by the selected campaign&rsquo;s brand.</li>
              <li><strong>Show Matrix Logo:</strong> Displays the Matrix Medical Communications logo at the bottom of the dashboard.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Sidebar &mdash; Context-Aware Template Controls</h3>
            <p>
              The sidebar dynamically detects which tables are present on the canvas and reveals specialized control panels accordingly.
              This is one of the most powerful features of the Dashboard Builder&mdash;when you add a table for a specific data source (e.g., Video Metrics,
              Online Journal Metrics, or Social Media Metrics), a corresponding rich control panel appears in the Controls tab that lets you
              <strong> select data, calculate aggregate statistics, and automatically insert metrics and images/thumbnails directly onto the canvas from the sidebar</strong>.
            </p>
            <p>Detection is based on table titles and IDs:</p>
            <ul>
              <li>A table titled <strong>&ldquo;Online Journal Metrics&rdquo;</strong> or with an ID containing <code>journal</code> activates the <em>Online Journal Controls</em>.</li>
              <li>A table titled <strong>&ldquo;Video Metrics&rdquo;</strong> or with an ID containing <code>video</code> activates the <em>Video Controls</em>.</li>
              <li>A table titled <strong>&ldquo;Social Media Metrics&rdquo;</strong> or with a title/ID containing <code>social</code> activates the <em>Social Media Controls</em>.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Online Journal Controls</h3>
            <p>
              Appears when an Online Journal Metrics table is on the canvas. Powered by data from Walsworth (the online journal publishing platform),
              this panel lets you select a publication and its issues, view calculated aggregate metrics, and insert both metric values and journal cover images
              directly from the sidebar.
            </p>

            <h4>Publication Selector</h4>
            <p>
              A dropdown displaying all available publications. The list is split into two groups: <strong>Best Matches</strong> appear at the top
              (auto-scored based on how well the publication name matches the current campaign name), followed by <strong>All Publications</strong> sorted
              alphabetically. A search input at the top allows filtering by publication name. Each entry shows the publication name and the number of available issues.
            </p>
            <p>
              The matching algorithm uses abbreviation expansion to convert short disease codes in the campaign name into their full forms
              (e.g., NSCLC &rarr; Non-Small Cell Lung Cancer, GPP &rarr; Generalized Pustular Psoriasis, HS &rarr; Hidradenitis Suppurativa,
              MBC &rarr; Metastatic Breast Cancer, and many others). It also matches by publication type keywords (Hot Topics, JCAD, ICNS, NPPA, etc.).
              The best-matching publication is auto-selected when a campaign changes.
            </p>

            <h4>Issue Selection</h4>
            <p>
              Once a publication is selected, a collapsible <strong>Issues</strong> dropdown appears showing &ldquo;Issues (X/Y selected)&rdquo; where
              X is the number of checked issues and Y is the total. Features include:
            </p>
            <ul>
              <li>Search box to filter issues by name.</li>
              <li>Checkboxes for each issue to include or exclude it from calculations.</li>
              <li>Month/year badges for each issue (e.g., &ldquo;Jan &rsquo;23&rdquo;).</li>
              <li>Issue visit counts displayed on the right side of each entry.</li>
              <li>Multi-select capability&mdash;toggle individual issues on and off to refine the aggregate metrics.</li>
            </ul>
            <p>Issues are sorted by date (newest first) using a scoring system based on year and month extracted from the issue name.</p>

            <h4>Journal Aggregate Metrics</h4>
            <p>
              Below the issue selection, four metric cards are displayed, each showing the aggregate value calculated from the selected issues only.
              Each metric card has a <strong>&ldquo;+&rdquo; button</strong> that, when clicked, automatically inserts that metric&rsquo;s name
              and value as a new row in the Online Journal Metrics table on the canvas:
            </p>
            <ul>
              <li><strong>Avg Time in Issue:</strong> Weighted average of time users spend per issue across the selected issues.</li>
              <li><strong>Total Page Views:</strong> Sum of page views across all selected issues.</li>
              <li><strong>Unique Page Views:</strong> Sum of unique page views across all selected issues.</li>
              <li><strong>Total Issue Visits:</strong> Sum of issue visits across all selected issues.</li>
            </ul>

            <h4>Add Cover Images</h4>
            <p>
              A button that fetches journal cover images from Walsworth and places them directly onto the canvas. The button label dynamically
              changes based on how many issues are selected (&ldquo;Add Cover Image&rdquo; for 1, &ldquo;Add Cover Images&rdquo; for multiple).
            </p>
            <ul>
              <li><strong>Single issue selected:</strong> Fetches and places one full-size cover image on the canvas.</li>
              <li><strong>Multiple issues selected:</strong> Fetches covers for the oldest and newest selected issues and places them side-by-side on the canvas.</li>
            </ul>
            <p>
              Cover images are fetched via the API endpoint <code>/api/journal-cover?issue_url=&#123;url&#125;</code> and are tagged with
              metadata identifying them as journal covers for special rendering behavior.
            </p>
          </div>

          <div className="docs-card">
            <h3>Video Controls</h3>
            <p>
              Appears when a Video Metrics table is on the canvas. Powered by YouTube playlist and video data fetched from Azure Blob Storage,
              this panel provides playlist and video selection, live aggregate metric calculations, and the ability to automatically insert
              YouTube video thumbnails directly onto the canvas.
            </p>

            <h4>Playlist Selection</h4>
            <p>
              When no playlist is selected, the panel displays a list of all available YouTube playlists sorted into two groups:
              <strong>Best Matches</strong> (auto-scored based on campaign name similarity using the same abbreviation expansion system as journals)
              and <strong>All Playlists</strong> below. Each playlist entry shows its title, match score (if applicable), and total video count.
              Clicking a playlist selects it and loads its videos.
            </p>

            <h4>Video Selection</h4>
            <p>
              Once a playlist is selected, a collapsible <strong>Videos</strong> dropdown appears showing &ldquo;Videos (X/Y selected)&rdquo;
              where X is the number of active (non-excluded) videos and Y is the total in the playlist. Features include:
            </p>
            <ul>
              <li>Search box to filter videos by title.</li>
              <li>Checkbox for each video&mdash;checked means included in aggregate calculations, unchecked means excluded.</li>
              <li>Each video entry shows: title (truncated with tooltip for long names), published date (e.g., &ldquo;Jan &rsquo;23&rdquo;), and view count (right-aligned).</li>
              <li>Toggling any video checkbox <strong>immediately recalculates</strong> all aggregate metrics below.</li>
            </ul>

            <h4>Video Aggregate Metrics</h4>
            <p>
              Four metric cards are displayed, each calculated from the active (non-excluded) videos only. Each card has a <strong>&ldquo;+&rdquo; button</strong>
              that inserts the metric as a new row in the Video Metrics table on the canvas:
            </p>
            <ul>
              <li><strong>Total Watch Time:</strong> Sum of all active videos&rsquo; watch time, formatted in human-readable form (e.g., &ldquo;5d 3h 22m&rdquo; or &ldquo;12h 45m&rdquo;).</li>
              <li><strong>Avg Time Watched:</strong> Average percentage watched across all active videos (0&ndash;100%).</li>
              <li><strong>Total Views:</strong> Sum of views across all active videos.</li>
              <li><strong>Most Watched Video:</strong> Title of the video with the highest view count among active videos.</li>
            </ul>

            <h4>Add Top Thumbnails</h4>
            <p>
              A button that automatically fetches YouTube video thumbnails for the top 3 most-viewed active videos and places them directly
              onto the canvas. Thumbnail URLs follow the pattern <code>https://img.youtube.com/vi/&#123;videoId&#125;/maxresdefault.jpg</code>
              with a fallback to <code>hqdefault.jpg</code> if the high-resolution version is unavailable.
            </p>
            <p>Thumbnail placement is <strong>template-aware</strong>:</p>
            <ul>
              <li><strong>Expert Perspectives Single:</strong> 1 thumbnail at a predefined position (352&times;200px).</li>
              <li><strong>Expert Perspectives Multi:</strong> 2 thumbnails side-by-side (248&times;136px each).</li>
              <li><strong>All other templates:</strong> Up to 3 thumbnails stacked vertically (200&times;112px each).</li>
            </ul>
            <p>
              Each thumbnail carries embedded video metadata (video ID, title, views, average percentage watched) enabling the optional overlay feature.
            </p>

            <h4>Thumbnail Overlay</h4>
            <p>
              A <strong>&ldquo;Show View Overlay&rdquo;</strong> checkbox. When enabled, a semi-transparent gradient bar appears at the bottom of each
              YouTube thumbnail displaying the view count (e.g., &ldquo;12,345 views&rdquo;) and the average watch percentage (e.g., &ldquo;68.2% watched&rdquo;).
              The overlay font size adapts to the thumbnail dimensions.
            </p>
          </div>

          <div className="docs-card">
            <h3>Social Media Controls</h3>
            <p>
              Appears when a Social Media Metrics table is on the canvas. This panel supports three platforms&mdash;Facebook, Instagram,
              and LinkedIn&mdash;and provides post selection, aggregate metric calculations, and the ability to insert social post images
              directly onto the canvas.
            </p>

            <h4>Platform Toggle Buttons</h4>
            <p>
              Three buttons for Facebook, Instagram, and LinkedIn, each showing the platform name and total post count in parentheses.
              Clicking a button toggles that platform on or off. When a platform is disabled, all selected posts from that platform are
              cleared from the selection. This allows you to focus calculations and display on specific platforms.
            </p>

            <h4>Post Selection</h4>
            <p>
              A collapsible dropdown showing &ldquo;Posts (X/Y selected)&rdquo; where X is the number of selected posts and Y is the total
              available across enabled platforms. Features include:
            </p>
            <ul>
              <li>Search box to filter posts by text content.</li>
              <li>Checkbox for each post (checked = included in aggregate calculations).</li>
              <li>Each post entry shows: post text (truncated to 60 characters), platform badge (FB/IG/LI), creation date, and engagement count (right-aligned).</li>
              <li>Posts are sorted by highest engagements first.</li>
            </ul>

            <h4>Social Aggregate Metrics</h4>
            <p>
              Five metric cards calculated from selected posts across all enabled platforms. Each has a <strong>&ldquo;+&rdquo; button</strong> that inserts the value into the matching row
              in the Social Media Metrics table:
            </p>
            <ul>
              <li><strong>Impressions:</strong> Sum of impressions across all selected posts (Facebook, Instagram, and LinkedIn). Inserts into the &ldquo;Impressions&rdquo; row.</li>
              <li><strong>Engagements:</strong> Sum of all interactions across selected posts (all platforms).</li>
              <li><strong>Engagement Rate:</strong> Total engagements &divide; total impressions across all platforms, displayed as a percentage. Inserts into the &ldquo;Engagement Rate&rdquo; row.</li>
              <li><strong>Clicks:</strong> Sum of clicks from Facebook and LinkedIn only (Instagram does not track clicks).</li>
              <li><strong>CTR:</strong> Facebook + LinkedIn clicks &divide; Facebook + LinkedIn impressions, displayed as a percentage. Inserts into the &ldquo;CTR&rdquo; row.</li>
            </ul>

            <h4>Add Top Posts</h4>
            <p>
              A button that takes the top 3 selected posts by engagement (filtered to those with an image or thumbnail URL) and places
              their images directly onto the canvas at 200&times;200px. Adding new social post images replaces any previously added social
              posts on the canvas. Each image carries metadata including post ID, text, engagement count, and platform.
            </p>

            <h4>Social Post Overlay</h4>
            <p>
              A <strong>&ldquo;Show Engagement Overlay&rdquo;</strong> checkbox. When enabled, a semi-transparent gradient bar appears at the bottom
              of each social post image displaying the engagement count (e.g., &ldquo;1,234 engagements&rdquo;) and the platform name.
              The overlay adapts its font size to the image dimensions.
            </p>
          </div>

          <div className="docs-card">
            <h3>Sidebar &mdash; Add Components Tab</h3>
            <p>The second tab provides tools for inserting new components onto the canvas, organized into sections.</p>

            <h4>Ready-Made Tables</h4>
            <p>Buttons that insert pre-configured table templates onto the canvas. Adding any of these tables also activates the corresponding context-aware controls in the Controls tab:</p>
            <ul>
              <li><strong>Landing Page Impressions:</strong> Table with columns Metric / Value and pre-filled rows for 728&times;90 and 300&times;250 banner ad impression tracking.</li>
              <li><strong>Video Metrics:</strong> Table with columns Metric / Value and rows for Total Time Watched, Avg Time Watched, Total Impressions. <em>Adding this table activates the Video Controls in the sidebar.</em></li>
              <li><strong>Online Journal Metrics:</strong> Table with columns Metric / Value and rows for Avg Time in Issue, Total Page Views, Total Issue Visits. <em>Adding this table activates the Online Journal Controls in the sidebar.</em></li>
              <li><strong>LinkedIn Social Media Metrics:</strong> Table with columns Metric / Value and rows for Impressions, Engagement Rate, CTR. <em>Adding this table activates the Social Media Controls in the sidebar.</em></li>
            </ul>

            <h4>Basic Components</h4>
            <ul>
              <li><strong>Add Card:</strong> Inserts a blank metric card with default title &ldquo;New Card&rdquo;, value &ldquo;0&rdquo;, and dimensions 180&times;100px. Card is placed at a randomized offset from position (100, 100).</li>
            </ul>

            <h4>Engagement &amp; Volume Metrics</h4>
            <p>
              A searchable list of all available metrics. A search input at the top filters the list. Clicking any metric button adds a
              pre-filled card onto the canvas with the value automatically calculated from the selected campaign&rsquo;s data. Available metrics include:
            </p>
            <ul>
              <li>Unique Open Rate, Total Open Rate, Unique Click Rate, Total Click Rate</li>
              <li>Delivery Rate, Mobile Engagement Rate, Average Time to Open (hours)</li>
              <li>1-Hour Open Rate, 6-Hour Open Rate, 12-Hour Open Rate, 24-Hour Open Rate</li>
              <li>Unique Opens, Total Opens, Unique Clicks, Total Clicks</li>
              <li>Delivered, Sent, Bounces, Estimated Patient Impact</li>
            </ul>

            <h4>Special Metrics</h4>
            <ul>
              <li><strong>Authority Metrics:</strong> Adds a table showing engagement by professional credential (MD, DO, NP, PA). Auto-populated from the campaign&rsquo;s authority metrics data.</li>
              <li><strong>Regional Geographic Distribution:</strong> Adds a table showing engagement by region (Northeast, Southeast, Midwest, West) with engagement rates and volumes. Auto-populated from the campaign&rsquo;s geographic distribution data.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Sidebar &mdash; Restore Tab</h3>
            <p>
              Lists all components that have been deleted during the current session. Each entry shows the component&rsquo;s title, type,
              and last known value. Clicking a deleted component&rsquo;s card restores it to the canvas at its previous position.
              An empty-state message is displayed when no deleted components exist.
            </p>
          </div>

          <div className="docs-card">
            <h3>Sidebar &mdash; Archive Tab</h3>
            <p>
              Provides access to previously saved dashboards. Features include a search box to filter saved dashboards by title and a
              refresh button to reload the list from the server. Each saved dashboard entry shows its title and last modified date,
              with a <strong>Load</strong> button to restore the dashboard to the canvas and a <strong>Delete</strong> button to permanently
              remove it from the archive. Dashboards are persisted to and loaded from the backend API.
            </p>
          </div>

          <div className="docs-card">
            <h3>Drag-and-Drop System</h3>
            <p>
              Built on React DnD with the HTML5 backend. Components snap to an <strong>8-pixel grid</strong> during movement.
              The system supports two drag types: METRIC (from sidebar to canvas) and CARD (reordering on canvas).
            </p>

            <h4>Alignment Guides</h4>
            <p>
              Red alignment lines appear when a component's edge or center aligns with another component or the canvas edges/center.
              The snap threshold is <strong>8 pixels</strong>. Guides are rendered as 1px-wide overlay lines and automatically
              snap the component into alignment.
            </p>

            <h4>Resize</h4>
            <p>
              All components support resize via a drag handle at the bottom-right corner. Minimum dimensions are enforced per component type
              (e.g., MetricCard: 50&times;30px, Table: 50&times;40px).
            </p>
          </div>

          <div className="docs-card">
            <h3>Data Binding</h3>
            <p>
              Campaign data is fetched from Azure Blob Storage (<code>dashboard_metrics.json</code>). When a campaign is selected,
              the following data is bound to components:
            </p>
            <ul>
              <li><strong>Core Metrics:</strong> Open rates, click rates, delivery rate, time-based open rates, mobile engagement rate.</li>
              <li><strong>Volume Metrics:</strong> Delivered, sent, unique opens, total opens, unique clicks, total clicks, bounces.</li>
              <li><strong>Specialty Performance:</strong> Per-specialty open rates, audience totals, performance deltas.</li>
              <li><strong>Authority Metrics:</strong> MD, DO, NP, PA engagement rates.</li>
              <li><strong>Geographic Distribution:</strong> Per-region engagement rates and volumes.</li>
            </ul>
            <p>
              The specialty merge option groups sub-specialties by their base name (text before the first dash), recalculating
              aggregated metrics.
            </p>
          </div>

          <div className="docs-card">
            <h3>Themes</h3>
            <p>Six themes are available, each defining a complete color system:</p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>Theme</th><th>Primary Color</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td>JCAD</td><td>#00857a</td><td>Teal/green palette</td></tr>
                  <tr><td>Oncology</td><td>#2a5fa3</td><td>Blue palette</td></tr>
                  <tr><td>ICNS</td><td>#1a365d</td><td>Blue/indigo palette</td></tr>
                  <tr><td>NPPA</td><td>#543378</td><td>Purple/teal palette</td></tr>
                  <tr><td>Matrix</td><td>#575757</td><td>Gray/navy palette</td></tr>
                  <tr><td>NHR</td><td>#25408f</td><td>Navy palette</td></tr>
                </tbody>
              </table>
            </div>
            <p>Each theme includes: primary, primaryDark, secondary, secondaryLight, accent, white, gray tones, text colors, border, surface, utility colors (success, warning, info), and multiple gradient definitions (primary, secondary, hero, card, specialty).</p>
          </div>

          <div className="docs-card">
            <h3>Grid System & Layout Engine</h3>
            <p>
              The layout engine operates on a <strong>5-column &times; 6-row grid</strong> with 24px gaps and 20px padding.
              Cell dimensions are calculated dynamically. Reserved zones exist for logos (row 1, col 5) and images (rows 2-4, cols 4-5).
            </p>
            <p>
              The auto-layout algorithm places cards using a first-fit strategy based on priority:
              Hero (2&times;2 span) &gt; Secondary (2&times;1) &gt; Performance (1&times;1) &gt; Specialty (1&times;1).
            </p>
          </div>

          <div className="docs-card">
            <h3>State Persistence</h3>
            <p>
              Canvas state (components, positions, styles) is persisted to <code>localStorage</code> under the key <code>dashboard-canvas-state</code>.
              This ensures the dashboard survives page refreshes. Changes are saved automatically on significant state updates.
            </p>
          </div>

        </section>


        <section id="ab-testing" className="docs-section">
          <h2>5. A/B Testing</h2>

          <div className="docs-card">
            <h3>Overview</h3>
            <p>
              The A/B Testing module automatically detects A/B test campaigns based on naming conventions and provides statistical
              analysis of test results. It includes active test monitoring and historical result aggregation.
            </p>
          </div>

          <div className="docs-card">
            <h3>Test Detection Logic</h3>
            <p>
              A/B tests are automatically detected by scanning campaign names for the pattern:
            </p>
            <div className="docs-formula">
              <code>Campaign Name - Group [A-Z]</code>
            </div>
            <p>
              The regex used is: <code>/[-&ndash;&mdash;]\s*group\s+[a-z]\b/i</code>. This matches variations such as
              "Campaign X - Group A", "Campaign X &ndash; Group B", etc.
            </p>

            <h4>Grouping Process</h4>
            <ol>
              <li>Filter campaigns with <code>Delivered &ge; 100</code> and matching the group pattern.</li>
              <li>Clean campaign names by removing deployment numbers.</li>
              <li>Merge multi-deployment campaigns (sum engagement metrics, use Deployment #1 base values).</li>
              <li>Group by base campaign name (without the Group A/B suffix) to form test pairs/groups.</li>
              <li>Only tests with 2 or more groups are displayed.</li>
              <li>Sort by send date (newest first).</li>
            </ol>
          </div>

          <div className="docs-card">
            <h3>Active Test Cards</h3>
            <p>Each detected test appears as an expandable card with:</p>
            <ul>
              <li><strong>Header:</strong> Test name, category badge, market badge, status badge (active/completed).</li>
              <li><strong>Groups Display:</strong> Side-by-side group cards separated by a "VS" divider.</li>
              <li><strong>Per-Group Metrics:</strong> Delivered, Unique Opens, Unique Open Rate (with proportional bar), Total Opens, Total Open Rate (with proportional bar).</li>
              <li><strong>Group Metadata:</strong> Editable subcategory (creatable dropdown), notes text area, and campaign name pattern. For "Time of Day" category tests, the actual send time is fetched and displayed.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Statistical Analysis</h3>
            <p>
              Each test includes a statistical significance analysis section using the <strong>two-sample proportion Z-test</strong>.
            </p>

            <h4>Methodology</h4>
            <p>
              The primary metric analyzed is <strong>Unique Open Rate</strong>. Groups are ranked by rate (highest first),
              and the best-performing group is compared against all others.
            </p>

            <h4>Statistical Outputs</h4>
            <ul>
              <li><strong>Z-Score:</strong> The standardized test statistic measuring the difference between group proportions.</li>
              <li><strong>P-Value:</strong> The probability of observing this difference by chance.</li>
              <li><strong>95% Confidence Interval:</strong> Range within which the true difference likely falls.</li>
              <li><strong>Relative Lift:</strong> Percentage improvement of the winning group over the comparison group.</li>
            </ul>

            <h4>Significance Thresholds</h4>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>P-Value</th><th>Confidence Level</th></tr></thead>
                <tbody>
                  <tr><td>&lt; 0.001</td><td>99.9%</td></tr>
                  <tr><td>&lt; 0.01</td><td>99%</td></tr>
                  <tr><td>&lt; 0.05</td><td>95%</td></tr>
                  <tr><td>&ge; 0.05</td><td>Not Significant</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              A sample adequacy warning appears if any group has fewer than 100 samples, as small sample sizes may
              produce unreliable statistical results.
            </p>
          </div>

          <div className="docs-card">
            <h3>Test Metadata (Auto-Save)</h3>
            <p>
              Test metadata is automatically saved to the database when fields are modified. Editable fields include:
            </p>
            <ul>
              <li><strong>Category:</strong> Creatable dropdown (type to create new options).</li>
              <li><strong>Market:</strong> Creatable dropdown.</li>
              <li><strong>Status:</strong> Active or Completed.</li>
              <li><strong>Description:</strong> Free-text area.</li>
              <li><strong>Notes:</strong> Free-text area.</li>
            </ul>
            <p>The creatable dropdown allows filtering existing options by typing and creating new options by pressing Enter.</p>
          </div>

          <div className="docs-card">
            <h3>Historical Results</h3>
            <p>
              The Historical Results tab aggregates all past test outcomes from the database.
            </p>

            <h4>Summary Statistics</h4>
            <ul>
              <li><strong>Total Tests:</strong> Count of all filtered tests.</li>
              <li><strong>Significant Tests:</strong> Tests where a statistically significant winner was found.</li>
              <li><strong>No Winner:</strong> Tests with no significant difference.</li>
              <li><strong>Average Lift:</strong> Mean of the absolute relative lift values across all significant tests.</li>
            </ul>

            <h4>By Market Breakdown</h4>
            <p>Shows total tests, significant count, and average lift per market, sorted by test count descending.</p>

            <h4>Winning Approaches by Subcategory</h4>
            <p>Groups winners by the winning group's subcategory. Displays: win count, average lift, beaten approaches with frequency, and top market for each winning approach.</p>

            <h4>Historical Table</h4>
            <p>
              Expandable rows with columns: Test Name, Category, Market, Winner (Group label), Winning Approach, P-Value,
              Lift (color-coded), Significance status, and Date. Expanding a row reveals the description, notes, group-by-group
              breakdown, and all pairwise metric comparisons.
            </p>
            <p>
              Winner, lift, and significance for each historical test are computed client-side from the live
              <code> /api/ab-testing/campaigns</code> data using the same two-proportion z-test applied to active tests
              (Unique Open Rate, with deployment-merging). This ensures a test that showed &ldquo;Group A wins&rdquo;
              while Active will continue to show &ldquo;Group A&rdquo; after being marked Completed.
            </p>

            <h4>Reactivate</h4>
            <p>
              Each historical row has a <strong>Reactivate</strong> button that flips the test&rsquo;s status back to
              <code> active</code> via <code>PUT /api/ab-testing/tests/{'{'}id{'}'}</code>. The test is immediately removed
              from Historical Results, added back to the Active Tests list, and the UI switches to the Active tab.
            </p>
          </div>
        </section>


        <section id="reports-management" className="docs-section">
          <h2>6. Reports Management</h2>

          <div className="docs-card">
            <h3>Overview</h3>
            <p>
              Reports Management is the most complex module in the platform. It handles multi-agency report tracking,
              weekly submission workflows, metadata enrichment, JSON generation for 15+ agencies, aggregate (AGG) report management,
              CMI contract validation, and GCM placement selection.
            </p>
          </div>

          <div className="docs-card">
            <h3>Report Timeframe Logic</h3>
            <p>
              Reports are organized into weekly cycles. Each campaign can have up to 3 reporting weeks (Week 1, 2, 3).
              The system determines the current week based on the Monday of the current calendar week.
            </p>
            <ul>
              <li><strong>Current Week Reports:</strong> Reports with a week number &le; the current week number that are not no-data or monthly-archive types.</li>
              <li><strong>No-Data Reports:</strong> Reports flagged as <code>is_no_data_report = true</code> for the current week.</li>
              <li><strong>Past/Archive Reports:</strong> Reports whose reporting week has passed. Each past report generates 3 week entries (Week 1, 2, 3) with aging information.</li>
              <li><strong>Monthly Reports:</strong> Included only during the first week of each month.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Report Deduplication</h3>
            <p>
              Reports are deduplicated by standardized campaign name. When multiple reports share the same name:
            </p>
            <ol>
              <li>Prefer the Deployment #1 report (if it exists).</li>
              <li>Otherwise, prefer the report without a deployment number.</li>
              <li>Otherwise, use the first report in the group.</li>
            </ol>
          </div>

          <div className="docs-card">
            <h3>Tabs & Views</h3>
            <ul>
              <li><strong>Current Week:</strong> Reports due this week with 3 week columns for submission tracking. Includes search, sort, pagination (100 rows), batch export buttons, no-data section, and statistics header.</li>
              <li><strong>Future:</strong> CMI expected reports with future reporting weeks (not yet due). Displays Brand, Vehicle, Placement description, Data Type, Frequency, Week date range, and &ldquo;Upcoming&rdquo; status. 10 rows per page with pagination and search filtering.</li>
              <li><strong>Archive:</strong> Past reports organized by agency tabs (CMI first, then alphabetical). 100 rows per page, grouped by week range.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Current Week - Three-Section Structure (CMI Placement Coverage)</h3>
            <p>
              The Current Week tab partitions every CMI <code>placement_id</code> into one of three mutually-exclusive sections,
              all keyed by <code>cmi_placement_id</code>. This guarantees that no contracted placement is silently forgotten.
            </p>
            <ol>
              <li>
                <strong>Data to Report (Due This Week):</strong> Campaigns + AGGs that we are actively submitting for the current
                reporting week. Source: <code>getCurrentWeekReports</code> + attached/standalone AGGs. Each row tracks Week 1/2/3
                submission via checkboxes.
              </li>
              <li>
                <strong>No Data to Report:</strong> Placement IDs that CMI <em>expects</em> data for (from <code>/api/unified/no-data</code>,
                exposed as <code>cmiExpectedNoData.allExpectedPlacementIds</code>) but which are <em>not</em> in section 1. Split into
                two sub-tables:
                <ul>
                  <li><strong>AGG Only:</strong> Expected aggregate-only placements with an Assign action to attach to a campaign.</li>
                  <li><strong>PLD &amp; AGG:</strong> Expected PLD+AGG placements with a Move action to promote them into the Due This Week list.</li>
                </ul>
                Each row has a Confirmed checkbox (persisted as <code>{'{id}'}_no_data</code>).
              </li>
              <li>
                <strong>Not Expected by CMI - AGG Only / PLD & AGG:</strong> Two sub-tables mirroring the No Data to Report layout
                (section 2). Every <code>placement_id</code> in our <code>cmi_contract_values</code> table for the current year,
                unioned with placements CMI tracks in <code>cmi_metadata_schedule</code> but that we don't have a contract row for
                (fetched from <code>GET /api/cmi-contracts/validation?year=YYYY</code>), deduplicated by <code>placement_id</code>,
                minus <code>dueThisWeekPlacementIds</code> minus <code>cmiExpectedNoData.allExpectedPlacementIds</code>.
                <br/><br/>
                <strong>Bucket classification</strong> (computed in <code>getOrphanedContractPlacements</code> per record):
                <ul>
                  <li><code>data_type === 'AGG'</code> → AGG Only bucket. Frequency defaults to <code>Monthly</code> unless an explicit value is set.</li>
                  <li>Explicit <code>frequency === 'Monthly'</code> → AGG Only bucket (Monthly always implies AGG).</li>
                  <li>Everything else → PLD &amp; AGG bucket. Frequency defaults to <code>Weekly</code>.</li>
                </ul>
                <strong>Metric default</strong>: <code>'Opens_Unique'</code> when the source row has none.
                <br/><br/>
                <strong>AGG Only visibility</strong>: shown only during the first week of the month
                (via <code>isFirstWeekOfMonth()</code>) for prior-month reporting,
                EXCEPT for explicit Weekly + AGG entries which always show. PLD &amp; AGG bucket has no week constraint.
                <br/><br/>
                <strong>Confirmed checkbox</strong> on every row records a per-week no-data submission, persisted in the
                <code>cmi_orphan_no_data_submissions</code> table via <code>PUT /api/cmi-contracts/orphan-no-data/{'{placement_id}'}/submit</code>.
                Initial state is loaded from <code>GET /api/cmi-contracts/orphan-no-data/submissions</code> on mount.
                Unique constraint on <code>(placement_id, reporting_week_start)</code> — the checkbox resets each Monday
                while prior weeks remain in the table as an audit record.
                <br/><br/>
                <strong>Batch JSON</strong>: AGG Only orphans flow into <code>agg_no_data</code>, PLD &amp; AGG orphans into
                <code>pld_no_data</code>, deduplicated against entries already added from the expected no-data list and against
                campaigns/aggregates being reported on. Search-filterable on brand, placement_id, notes, metric, placement_description, and vehicle.
              </li>
            </ol>
          </div>

          <div className="docs-card">
            <h3>Submission Tracking</h3>
            <p>
              Each report has per-week checkboxes (Week 1, 2, 3). Checking a box marks that week as submitted.
            </p>
            <ul>
              <li><strong>Checkbox Key Format:</strong> <code>{'{reportId}'}_week_{'{weekNumber}'}</code></li>
              <li><strong>Visual States:</strong> Green = submitted, Red = overdue (past deadline, not submitted), Gray = pending.</li>
              <li><strong>Overdue Logic:</strong> Week 1 is overdue if current week &gt; 1 and Week 1 is unchecked. Week 2 is overdue if current week &gt; 3 and Week 2 is unchecked.</li>
              <li><strong>Persistence:</strong> Monthly reports use localStorage; regular reports use the backend API.</li>
              <li><strong>Not Needed Flag:</strong> Individual reports can be marked as "not needed" (separate from submission).</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Metadata Matching & Enrichment</h3>
            <p>
              The system attempts to match each report with campaign metadata using a confidence-based matching algorithm:
            </p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>Match Type</th><th>Confidence</th><th>Criteria</th></tr></thead>
                <tbody>
                  <tr><td>Exact ID</td><td>100%</td><td>Campaign ID matches exactly.</td></tr>
                  <tr><td>Name + Date</td><td>100%</td><td>Cleaned names equal AND send dates match.</td></tr>
                  <tr><td>Name Only</td><td>90%</td><td>Cleaned names equal, date missing.</td></tr>
                  <tr><td>Partial Name + Date</td><td>80%</td><td>Name contains match AND dates match.</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              Metadata priority (later sources override earlier):
            </p>
            <ol>
              <li>Matched campaign metadata</li>
              <li>Database agency_metadata</li>
              <li>Manual metadata (from localStorage)</li>
            </ol>
          </div>

          <div className="docs-card">
            <h3>CMI Contract Validation</h3>
            <p>
              For CMI reports, metadata is cross-referenced against the CMI contracts database. Validation warnings
              are generated when the following fields differ between metadata and the contract record:
            </p>
            <ul>
              <li>Contract Number (case-sensitive comparison)</li>
              <li>Placement Description (case-insensitive)</li>
              <li>Brand Name (case-insensitive)</li>
              <li>Vehicle Name (case-insensitive)</li>
              <li>Buy Component Type (case-insensitive)</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>JSON Generation by Agency</h3>
            <p>
              Each agency has a specific JSON schema for report submission. The system generates JSON in the correct
              format based on the report's agency assignment. Supported agencies and their key fields:
            </p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>Agency</th><th>Key Fields</th></tr></thead>
                <tbody>
                  <tr><td>CMI</td><td>start/end dates, placement IDs, client ID, brand, vehicle, contract number, media tactic ID, GCM placement IDs (max 2), metric</td></tr>
                  <tr><td>Boehringer Ingelheim</td><td>start/end dates, topic brand, therapeutic area, asset IDs</td></tr>
                  <tr><td>Amgen</td><td>start/end dates, channel partner, brand, promotion type, campaign code, offer/vendor/tactic codes</td></tr>
                  <tr><td>Ortho</td><td>start/end dates, campaign names array</td></tr>
                  <tr><td>Sun</td><td>start/end dates, brand</td></tr>
                  <tr><td>Castle</td><td>start/end dates, file name</td></tr>
                  <tr><td>Deerfield</td><td>start/end dates, tactic, campaign, brand</td></tr>
                  <tr><td>GoodApple</td><td>start/end dates, campaign, placement, creative</td></tr>
                  <tr><td>IQVIA</td><td>campaign patterns, folder (month), campaign month label</td></tr>
                  <tr><td>Klick</td><td>start/end dates, client name, advertiser name, placement IDs</td></tr>
                  <tr><td>Silverlight</td><td>start/end dates, campaign names array</td></tr>
                  <tr><td>Lucid</td><td>start/end dates, brand, publisher, program, campaign</td></tr>
                  <tr><td>PHM</td><td>start/end dates, file prefix, brand, campaign code, placement details, content details, source info, generate_aggregate flag</td></tr>
                  <tr><td>OMD</td><td>type, campaign, placement, creative, cost, ads</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="docs-card">
            <h3>Batch JSON Export</h3>
            <p>
              The batch export generates a single JSON object containing all reports for a given agency in the current week.
            </p>
            <h4>CMI Batch Structure</h4>
            <ul>
              <li><strong>campaigns:</strong> All campaign-level CMI metadata keyed by campaign name.</li>
              <li><strong>aggregate:</strong> All AGG reports keyed by descriptive name.</li>
              <li><strong>pld_no_data:</strong> Expected PLD reports with no data submitted, plus orphaned contracts whose <code>data_type</code> is PLD, PLD&amp;AGG, or unspecified.</li>
              <li><strong>agg_no_data:</strong> Expected AGG reports with their metrics, plus orphaned contracts whose <code>data_type</code> is AGG.</li>
            </ul>
            <p>
              Orphaned contract placements (Section 3 of the Current Week view) are folded into <code>pld_no_data</code> /
              <code>agg_no_data</code> by contract <code>data_type</code>: <code>AGG</code> → <code>agg_no_data</code>; everything else → <code>pld_no_data</code>.
              Deduplicated by <code>cmi_placement_id</code> against entries already added from the expected no-data list and against
              campaigns/aggregates being reported on. Monthly orphans are still suppressed outside the first week of the month.
            </p>
          </div>

          <div className="docs-card">
            <h3>AGG (Aggregate) Report Management</h3>
            <p>
              AGG reports track aggregate-level metrics (e.g., total opens) that may be separate from individual campaign reports.
            </p>
            <ul>
              <li><strong>Add AGG:</strong> Look up a placement ID from contracts, then either attach to an existing campaign or create standalone.</li>
              <li><strong>Edit AGG:</strong> Modify aggregate value, metric, and GCM placement IDs (add/remove, displayed as array).</li>
              <li><strong>Move PLD to AGG:</strong> Convert a PLD (placement-level detail) report to an AGG report. Options: attach to a campaign (auto-suggest based on brand/last attachment) or create standalone.</li>
              <li><strong>Detach AGG:</strong> Remove an AGG from its parent campaign association.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>GCM Placement Management</h3>
            <ul>
              <li><strong>Upload:</strong> Upload a CSV file of GCM placements associated with a brand.</li>
              <li><strong>Selection:</strong> A modal displays available placements for the current brand. Maximum 2 placements can be selected per campaign.</li>
              <li><strong>Persistence:</strong> Selections are saved via API and reflected in the campaign's metadata.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Report Row Features</h3>
            <p>Each report row in the table displays:</p>
            <ul>
              <li>Campaign Name (clickable to open metadata modal)</li>
              <li>Brand and Agency labels</li>
              <li>Send Date</li>
              <li>Week 1/2/3 checkboxes with visual status indicators</li>
              <li><strong>Action Buttons:</strong>
                <ul>
                  <li>View icon: Open the metadata/JSON editor modal.</li>
                  <li>Chain/Unchain icon: Attach or detach AGG reports.</li>
                  <li>Plus icon: Add a new AGG report.</li>
                  <li>Move arrow: Move a PLD report to AGG status.</li>
                </ul>
              </li>
            </ul>

            <h4>Metadata Modal View Modes</h4>
            <ul>
              <li><strong>Layout Mode:</strong> Form-based editor with agency-specific fields. Includes save, copy-to-clipboard, and field-level editing.</li>
              <li><strong>JSON Mode:</strong> Raw JSON editor (textarea) for direct JSON manipulation. Some agencies (IQVIA, Ortho, Silverlight) default to JSON-only mode.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Pharma Company Mapping</h3>
            <p>
              When a report's <code>client_id</code> is true, the system infers the pharmaceutical company from the brand name
              using a hardcoded mapping (Lilly, AstraZeneca, Abbvie, J&J, Boehringer Ingelheim, Exelixis, Daiichi Sankyo, DSI, etc.).
              If no match is found in the hardcoded map, it falls back to a database lookup.
            </p>
          </div>

          <div className="docs-card">
            <h3>Sorting & Filtering</h3>
            <ul>
              <li><strong>Sort Options:</strong> By send date (ascending/descending, default) or by brand (alphabetical with campaign name as secondary sort).</li>
              <li><strong>Search:</strong> Filters by campaign name, brand, or agency (case-insensitive).</li>
              <li><strong>Pagination:</strong> Current/Archive tabs: 100 rows. Future tab: 10 rows. Up to 5 page buttons visible with Previous/Next navigation.</li>
            </ul>
          </div>
        </section>


        <section id="audience-analytics" className="docs-section">
          <h2>7. Audience Analytics</h2>

          <div className="docs-card">
            <h3>Overview</h3>
            <p>
              Audience Analytics provides tools for querying individual users, analyzing audience segments, looking up NPIs,
              looking up HCPs by specialty, analyzing list crossover, breaking down DMAs, identifying shadow engagers, detecting engagement patterns, managing print subscriptions, processing NCOA address updates, and onboarding new subscribers from form exports. It is organized into 11 sub-tabs:
              Find Users, Analyze Users, NPI Lookup, Specialty Lookup, HCP Targeting, Print Lists, Digital Lists, IQVIA List Efficiency, Subscriber Intake, DMA Breakdown, and Shadow Engagers.
            </p>
          </div>

          <div className="docs-card">
            <h3>Source Classification (Owned / Licensed / Market)</h3>
            <p>
              All audience-vs-market views in this section &mdash; NPI Quick Lookup, Specialty Lookup, Find Users, Analyze Users,
              HCP Targeting, and Digital Lists &mdash; replace the legacy <code>Audience</code> label with a three-way classification:
            </p>
            <ul>
              <li><strong>Owned:</strong> User is currently in at least one segment outside <code>IQVIA HCPs</code>/<code>HLD HCPs</code> &mdash; or, if no current segments, the most recent <code>added</code> event in <code>ac_membership_events</code> was a non-IQVIA/HLD segment.</li>
              <li><strong>Licensed:</strong> User is currently in only <code>IQVIA HCPs</code> and/or <code>HLD HCPs</code> segments &mdash; or, if no current segments, the most recent <code>added</code> event was IQVIA/HLD.</li>
              <li><strong>Market:</strong> User exists only in <code>universal_profiles</code> (the broader market universe) and is not in our audience.</li>
            </ul>
            <p>
              "Once owned, always owned" is enforced by the current-state rule: if a user is in any non-IQVIA/HLD segment today, they are Owned regardless of history.
              If they have no current segments, the most recent membership event determines classification, so a user moved from <code>Matrix Owned</code> to only <code>HLD HCPs</code> would now show as Licensed.
            </p>
            <p>
              Backed by a shared SQL helper in <code>backend/routes/source_classification.py</code> &mdash; the same <code>CASE</code> expression is reused across endpoints to keep classification consistent.
              For pre-computed views (HCP Targeting blob, Geographic heatmap), the frontend calls <code>POST /api/users/source-status-lookup</code> after loading the blob to enrich rows by NPI/email.
            </p>
            <p>
              Print Lists are intentionally excluded from this classification &mdash; they operate on a different audience model.
            </p>
          </div>

          <div className="docs-card">
            <h3>Find Users / Analyze Users</h3>
            <p>
              The Audience Query Builder supports two modes: <strong>Find</strong> (search for users) and <strong>Analyze</strong> (segment analysis).
            </p>
            <h4>Search Modes</h4>
            <ul>
              <li><strong>Specialty-Based:</strong> Select one or more specialties to filter users. Supports AND/OR logic toggle for multiple specialties.</li>
              <li><strong>Campaign-Based:</strong> Select campaigns to filter users who received those campaigns.</li>
              <li><strong>Engagement Type:</strong> Filter by All, Opened, Clicked, or No Action.</li>
            </ul>
            <h4>Results</h4>
            <p>
              Results display in a table with columns: Email, NPI, Name, Specialty, <strong>Source</strong> (Owned/Licensed), <strong>Status</strong> (Active/Inactive),
              Campaign Count, Opens, Clicks, Rates. Source and Status are also included in the CSV export.
              Source is determined by the user's <code>ac_segments</code> array (or, for users with no current segments, the most recent <code>added</code> event in <code>ac_membership_events</code>):
              Licensed if all current segments are <code>IQVIA HCPs</code>/<code>HLD HCPs</code>; Owned otherwise.
              Results are paginated (100 rows per page) using the standard pagination controls and sortable by clicking column headers. An &ldquo;Export CSV&rdquo; button sits at the top of the results.
            </p>
            <h4>Tier System</h4>
            <p>
              Results are organized into tiers based on list coverage (how many lists a user appears on). Each tier shows:
              user count, matched count, rates, campaign list, and specialty list. Tiers are expandable for detailed engagement metrics.
            </p>
            <p>State is persisted in localStorage under the key <code>audienceQueryState</code>.</p>
          </div>

          <div className="docs-card">
            <h3>NPI Quick Lookup</h3>
            <p>
              Bulk lookup of NPI (National Provider Identifier) numbers. Enter NPIs one per line in a textarea and click "Lookup NPIs".
            </p>
            <h4>Results</h4>
            <ul>
              <li>Summary: "Found X of Y NPIs" with count from each source.</li>
              <li>Source Breakdown: "X Owned | Y Licensed | Z Market".</li>
              <li>Missing NPIs listed separately.</li>
              <li>Table columns: NPI, First Name, Last Name, Specialty (mapped from taxonomy code), Address, City, State, Zipcode, Flag, Source (Owned/Licensed/Market badge), Status (Active/Inactive for audience users).</li>
              <li>Standard pagination (100 rows per page) with an &ldquo;Export CSV&rdquo; button at the top of the table.</li>
            </ul>
            <h4>Source Classification</h4>
            <ul>
              <li><strong>Owned:</strong> User is currently in at least one segment outside <code>IQVIA HCPs</code> / <code>HLD HCPs</code> (or, if no current segments, the most recent <code>added</code> event in <code>ac_membership_events</code> was a non-IQVIA/HLD segment).</li>
              <li><strong>Licensed:</strong> User is currently in only <code>IQVIA HCPs</code> and/or <code>HLD HCPs</code> segments (or, if no current segments, the most recent <code>added</code> event was IQVIA/HLD).</li>
              <li><strong>Market:</strong> User exists only in <code>universal_profiles</code> (not in our audience).</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Specialty Lookup</h3>
            <p>
              Returns all HCPs in the Market Universe (<code>universal_profiles</code>) plus your Audience (<code>user_profiles</code>) that match
              one or more specialties. Reuses the same specialty selection modal used in Find Users.
            </p>
            <h4>Specialty Selection</h4>
            <ul>
              <li>Click the selector to open the specialty modal. Search, Select All, Clear All, and multi-select are all supported.</li>
              <li>Selected specialties display as removable chips under the selector.</li>
              <li>Specialty list is sourced from the <code>/api/users/specialties</code> endpoint (same as Find Users).</li>
            </ul>
            <h4>Primary Action: Lookup NPIs</h4>
            <ul>
              <li>Columns: NPI, First Name, Last Name, Specialty, Address, City, State, Zipcode, Flag, Source (Owned/Licensed/Market), Status (Active/Inactive for audience users).</li>
              <li>"Hide non-active" toggle filters retired/deceased/inactive providers from the result table.</li>
              <li>Owned/Licensed records come from <code>user_profiles.specialty</code>; Market records come from <code>universal_profiles.primary_taxonomy_code</code> (reverse-mapped from the selected specialty text, since <code>primary_specialty</code> is NULL).</li>
              <li>Standard pagination (100 rows per page) with an &ldquo;Export CSV&rdquo; button at the top of the table.</li>
            </ul>
            <h4>Secondary Action: Calculate Specialty Counts</h4>
            <ul>
              <li>Discrete button placed next to "Lookup NPIs". Returns per-specialty totals across both tables.</li>
              <li>Table columns: Specialty, Market Universe, Licensed, Owned, Coverage (%). All columns sortable; standard pagination (100 rows per page).</li>
              <li>Coverage = (Licensed + Owned) / Market Universe by default.</li>
              <li>&ldquo;Hide non-active&rdquo; toggle re-fetches counts with inactive providers excluded.</li>
              <li>&ldquo;Merge subspecialties&rdquo; toggle merges everything before the first " - " in the specialty name (same logic as the Dashboard Builder merge toggle). Aggregate-only; does not affect the main lookup.</li>
              <li>&ldquo;Only Owned&rdquo; toggle hides the Licensed column and recalculates Coverage as Owned / Market Universe — useful for evaluating organic reach without leased segments.</li>
              <li>CSV export available (columns shift based on the Only Owned toggle).</li>
            </ul>
            <p>Backed by <code>POST /api/npi/specialty-lookup</code> and <code>GET /api/npi/specialty-counts</code>. The counts endpoint returns raw taxonomy-code counts from <code>universal_profiles</code>; the frontend maps codes to specialty text using <code>taxonomyMapping.js</code>.</p>
          </div>

          <div className="docs-card">
            <h3>List Efficiency Analysis</h3>
            <p>
              Three sub-tabs: <strong>Explorer</strong> (browse all lists/segments/tags as first-class entities),
              <strong>IQVIA Crossover</strong> (file-based crossover + engagement analysis),
              and <strong>Leasing Decision</strong> (live, DB-backed ownership analysis and decision workflow).
            </p>

            <h4>Sub-tab 1: Explorer</h4>
            <p>
              The "Find Users" pattern, but for lists and segments themselves. One filter row + one entity table.
              Each row is a brand (aggregated target lists), AC segment, AC tag, or digital list — with size,
              ownership breakdown (Owned / IQVIA / HLD / Missing), Owned %, market/agency, and top specialty.
              Click any row to drill into a detail modal showing ownership stats, top specialties, sample members,
              and overlapping entities across all four types.
            </p>
            <ul>
              <li><strong>Filter chips:</strong> All / Brands / AC Segments / AC Tags / Digital Lists (with counts).</li>
              <li><strong>Search:</strong> Matches name, market, agency, or top specialty.</li>
              <li><strong>Market filter:</strong> From <code>brand_editor_agency.industry</code>.</li>
              <li><strong>Sort:</strong> Size, Owned % (high or low), Name.</li>
              <li><strong>Min size:</strong> Hide tiny entities.</li>
              <li><strong>Refresh button:</strong> Forces server-side cache rebuild (otherwise cache is 15 min).</li>
              <li><strong>Drill-down overlaps:</strong> Click any overlap row to navigate to that entity's detail. Lets you walk the graph of relationships (e.g., Matrix Owned Emails → Spevigo brand → IQVIA HCPs segment).</li>
            </ul>
            <p>
              Backed by <code>GET /api/list-leasing/entities</code> and <code>GET /api/list-leasing/entities/&lt;type&gt;/&lt;name&gt;</code>.
              First request builds the index from <code>user_profiles.ac_segments / ac_tags / digital_lists_subscribed</code> and
              <code>universal_profiles.target_lists</code> (60-100s); subsequent requests served from a 15-minute in-memory cache.
              Filter/sort/search persist via localStorage.
            </p>

            <h4>Sub-tab 2: IQVIA Crossover</h4>
            <p>A 3-step workflow for analyzing list crossover and engagement by coverage tier.</p>
            <div className="docs-steps">
              <div className="docs-step">
                <div className="docs-step-num">1</div>
                <div className="docs-step-text">
                  <strong>Upload Files:</strong> Upload an IQVIA Full List (single file) and Target Lists (multiple files).
                  Supports .csv, .xlsx, .xls formats via drag-and-drop or file picker.
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">2</div>
                <div className="docs-step-text">
                  <strong>Calculate Crossover:</strong> Shows a distribution table of how many lists each user appears on,
                  with user counts and percentages. Summary: "X of Y people appeared on at least one list".
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">3</div>
                <div className="docs-step-text">
                  <strong>Analyze Engagement by Tier:</strong> Each coverage tier (1 List, 2+ Lists, etc.) gets an expandable card
                  showing: Total NPIs, Matched Count, Avg Unique Open Rate, Total Delivered, and a sortable user table
                  with all engagement metrics. Users can be loaded incrementally (+10 at a time).
                </div>
              </div>
            </div>
            <p>State is persisted in localStorage under the key <code>listAnalysisState</code>.</p>

            <h4>Sub-tab 3: Leasing Decision</h4>
            <p>
              Live replacement for the standalone Python <code>list_leasing_analysis</code> tool. Builds three
              ownership sets directly from the database — Matrix Owned (from <code>ac_segments</code>: "Matrix Owned Emails"),
              IQVIA Licensed ("IQVIA HCPs"), HLD Licensed ("HLD HCPs") — and classifies every targeted HCP into one of:
            </p>
            <ul>
              <li><strong>MMC Owned (let license expire)</strong> &mdash; owned AND on an IQVIA/HLD lease (redundant spend)</li>
              <li><strong>MMC Owned</strong> &mdash; owned only</li>
              <li><strong>IQVIA + HLD Licensed</strong> &mdash; on both leases, not owned</li>
              <li><strong>IQVIA Licensed</strong> / <strong>HLD Licensed</strong> &mdash; single lease, not owned</li>
              <li><strong>Missing</strong> &mdash; on a brand list but not owned/licensed (acquisition target)</li>
            </ul>

            <h4>Source Selection</h4>
            <ul>
              <li><strong>Universe:</strong> Universal Derms (taxonomy <code>207N*</code>, default), All Active Profiles, or upload a custom universe file.</li>
              <li><strong>Brand Target Lists:</strong> Two modes — <em>From Dashboard</em> (multi-select campaigns already attached to <code>user_profiles.target_lists</code> / <code>universal_profiles.target_lists</code>, grouped by brand via <code>brand_editor_agency</code>) or <em>Upload Files</em> (transient one-off Excel/CSV uploads with a brand label, not persisted to DB).</li>
              <li><strong>Filters:</strong> Time window (3m / 6m / 12m / All time), Market (industry from <code>brand_editor_agency</code>), Specialty.</li>
              <li>Modes can be mixed — DB picks + uploaded files in the same run.</li>
            </ul>

            <h4>Result Views</h4>
            <ul>
              <li><strong>Summary:</strong> Status count cards across the universe.</li>
              <li><strong>Brand Breakdown:</strong> Per-brand totals — Total NPIs, MMC Owned, Let Expire, IQVIA-only, HLD-only, Missing, Owned %. Exportable.</li>
              <li><strong>Master Match Results:</strong> Specialty pivot across the full universe with reach %.</li>
              <li><strong>Top HCPs:</strong> NPIs on the most brand lists (saturation/fatigue indicator).</li>
              <li><strong>Combined (Unique):</strong> Universe NPIs that appear on ≥1 brand list with ownership.</li>
              <li><strong>Match Results:</strong> Specialty pivot of matched (brand-targeted) NPIs only.</li>
              <li><strong>Per-Brand:</strong> Drill into a single brand's NPI list.</li>
            </ul>

            <h4>Decision Queue</h4>
            <p>
              Surfaces every "Let Expire" candidate as an actionable row. Inline action dropdown
              (Let Expire / Keep / Convert to Owned) and a bulk "Mark All as Let Expire". Decisions are
              persisted to the <code>leasing_decisions</code> table (audit trail with status: pending / executed / reverted).
              Export the queue as CSV to share with vendors at renewal time.
            </p>

            <h4>HCP Drill-Down</h4>
            <p>
              Click any NPI link in any view. Shows profile basics, current AC segments + tags, engagement summary,
              target list history, segment change timeline (from <code>ac_membership_events</code>), past decisions, and an
              "Add Decision" form.
            </p>

            <h4>Endpoints</h4>
            <ul>
              <li><code>GET /api/list-leasing/available-sources</code> &mdash; brands + campaigns within window</li>
              <li><code>POST /api/list-leasing/upload-temp-file</code> &mdash; parse a file, return token (2-hour TTL)</li>
              <li><code>POST /api/list-leasing/run-analysis</code> &mdash; main computation, returns all views</li>
              <li><code>GET/POST/PATCH/DELETE /api/list-leasing/decisions</code> &mdash; decision CRUD</li>
              <li><code>GET /api/list-leasing/hcp/&lt;npi&gt;</code> &mdash; full HCP drill-down</li>
              <li><code>POST /api/list-leasing/redundancy-check</code> &mdash; inline NPI list redundancy check (e.g., from Campaign Modal)</li>
            </ul>
            <p>Scope is persisted in localStorage under <code>leasingDecisionScope</code>. Active sub-tab persists under <code>listEfficiencySubTab</code>.</p>
          </div>

          <div className="docs-card">
            <h3>DMA Breakdown</h3>
            <p>
              Upload list files (.csv, .xlsx, .xls) to analyze geographic distribution by DMA (Designated Market Area) code.
            </p>
            <h4>Results</h4>
            <ul>
              <li>Summary cards: Total Records, DMA Regions count, Mapped count, Unmapped count (warning if &gt; 0).</li>
              <li>Table: DMA Number, Count, with Grand Total row.</li>
              <li>Export: CSV file "DMA_Breakdown.csv".</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Engagement Patterns</h3>
            <p>
              Identifies users exhibiting specific behavioral patterns. 10 patterns across 3 categories:
            </p>

            <h4>Engagement Level Patterns</h4>
            <ul>
              <li><strong>Hyper Engaged:</strong> Users with 70%+ open rate.</li>
              <li><strong>Infrequent Responders:</strong> Users with &lt; 10% open rate.</li>
              <li><strong>Heavy Inactive:</strong> Users who received many campaigns but opened 0%.</li>
            </ul>

            <h4>Behavior Patterns</h4>
            <ul>
              <li><strong>Click Champions:</strong> High click-through rate among openers.</li>
              <li><strong>Binge Readers:</strong> Open multiple emails in rapid succession.</li>
              <li><strong>Fast Openers:</strong> Open within 30 minutes of delivery.</li>
              <li><strong>One and Done:</strong> Opened early campaigns, then stopped engaging.</li>
            </ul>

            <h4>Timing & Trend Patterns</h4>
            <ul>
              <li><strong>Declining Engagement:</strong> Downward engagement trend over time.</li>
              <li><strong>Recently Re-engaged:</strong> Was inactive, now active again.</li>
              <li><strong>Weekend Warriors / Early Birds & Night Owls:</strong> Unusual timing patterns.</li>
            </ul>
            <p>
              Each pattern has configurable thresholds (e.g., minimum campaigns = 10, min open rate = 70%).
              Results include dynamic table columns and CSV export functionality.
            </p>
          </div>

          <div className="docs-card">
            <h3>Print Management</h3>
            <p>
              Centralized management for all print list subscriptions (JCAD, NPPA, BT).
              Replaces manual Excel-based list management. Layout: overview header bar, Manual/Drop File toggle, and subscriber table.
            </p>

            <h4>Page Header Search</h4>
            <ul>
              <li>When the Print Management tab is active, a search input appears in the Audience Analytics page header (same style as Campaign Performance, Brand Management, etc.).</li>
              <li>Searches across name, NPI, address, and email fields with 300ms debounce.</li>
            </ul>

            <h4>Print Lists Header</h4>
            <ul>
              <li>Section header bar showing per-list active counts (JCAD, NPPA, BT) and total unsubscribed.</li>
              <li>Each list count is clickable to export that list as CSV.</li>
            </ul>

            <h4>Manual Entry (left toggle)</h4>
            <ul>
              <li>Textarea for pasting email text or subscriber info.</li>
              <li>Auto-detects subscribe vs unsubscribe from text context (keywords: &ldquo;remove&rdquo;, &ldquo;unsubscribe&rdquo;, &ldquo;retired&rdquo;, &ldquo;deceased&rdquo;, etc.).</li>
              <li>Cross-checks parsed NPIs against existing records &mdash; flags duplicates, shows current lists, suggests unsubscribe when already fully subscribed.</li>
              <li>Preview table with editable fields: NPI, name, degree, address, list checkboxes, reason, blacklist toggle.</li>
              <li>&ldquo;Switch to Subscribe/Unsubscribe&rdquo; button to override auto-detection.</li>
              <li>Validation: blacklist check, NPPA eligibility (NP/PA only, MD/DO rejected), address discrepancy alerts.</li>
              <li>Auto-adds JCAD when subscribing to NPPA.</li>
              <li>Suggests blacklisting when text contains keywords like &ldquo;business closed&rdquo;, &ldquo;do not work here&rdquo;.</li>
            </ul>

            <h4>Drop File (right toggle)</h4>
            <ul>
              <li>Target list selector using toggle buttons (JCAD / NPPA / BT).</li>
              <li>Drag-and-drop zone for subscription form CSV uploads.</li>
              <li>Color-coded validation: green=valid, yellow=missing fields, orange=duplicate, red=ineligible/blacklisted.</li>
              <li>Summary stats (Total, Valid, Issues, Target) then confirm to import valid entries.</li>
            </ul>

            <h4>Subscribers Header &amp; Table</h4>
            <ul>
              <li>Subscribers section header shows total count, list filter dropdown, status filter dropdown, Expand All / Collapse button, and Export button &mdash; all inline in the header bar.</li>
              <li>Table columns: NPI, Name, Degree, Address, City, State, Zip, Lists (badges), Status (Active/Inactive/Comp badges). All columns are sortable.</li>
              <li>No pagination &mdash; initial load shows 25 rows with a &ldquo;Load More&rdquo; button to incrementally load 25 more, or &ldquo;Expand All&rdquo; to display the full dataset.</li>
            </ul>

            <h4>Data Sources</h4>
            <ul>
              <li>Active subscribers imported from JCAD Print List, NP+PA Print List, BT Print List, plus JCAD and BT Comp Lists.</li>
              <li>Unsubscribes imported from JCAD List Management (~1,044 records matched by NPI) and Hot Topics List Changes (6 specialty files, ~763 records matched by name+address). Hot Topics unsubs are also marked as unsubscribed from JCAD.</li>
              <li>Comp list members (non-HCPs without NPI) are flagged with a &ldquo;Comp&rdquo; badge.</li>
            </ul>

            <h4>Business Rules</h4>
            <ul>
              <li>NPI is the primary identifier; comp list people may lack NPI (use name + address).</li>
              <li>NPPA: only NP/PA/FNP/DNP/APRN/PA-C eligible. MD/DO rejected.</li>
              <li>Subscribing to NPPA auto-adds JCAD.</li>
              <li>All changes are logged in the activity log with timestamps.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>NCOA Upload</h3>
            <p>
              Standalone tab for processing Walsworth NCOA (National Change of Address) CSV exports. Drag-and-drop a file,
              the backend matches each row against <code>universal_profiles</code>, <code>user_profiles</code>, and
              <code>print_only_contacts</code>, then returns a diff plan you can review and selectively apply.
            </p>

            <h4>Matching</h4>
            <ul>
              <li>NCOA files contain no NPI &mdash; matching is by normalized last name + first-name compatibility (one is a prefix of the other to allow nicknames) + normalized old address (with suite-stripping fallback).</li>
              <li>On <code>universal_profiles</code>, the old address is checked against both <code>mailing_address_1</code> and <code>practice_address_1</code>; whichever side matched is the side that gets updated.</li>
              <li>On <code>user_profiles</code> and <code>print_only_contacts</code>, matched against the single <code>address</code> column.</li>
              <li>On <code>print_list_subscribers</code> (the table the JCAD/derm print list export pulls from), matched against <code>address_1</code> + <code>address_2</code> concatenated &mdash; ensures rows exported from the Print Lists UI are findable by NCOA.</li>
              <li>One NCOA row can match across multiple tables &mdash; the preview shows each match as its own row, tagged with the target table and side (Universal · mailing, Audience · address, Print List · address, etc.).</li>
              <li>Rows where the new address already equals what we have land in &ldquo;Already Current&rdquo; (collapsible, no-op).</li>
            </ul>

            <h4>Return Code Behavior</h4>
            <ul>
              <li><strong>Codes 19&ndash;29</strong> (foreign move, PO Box no-forwarding, vacant, undeliverable, etc.): Treated as undeliverable. Backend clears <code>print_lists_subscribed</code> JSONB and merges into <code>print_lists_unsubscribed</code> with reason <code>NCOA: &lt;decoded&gt;</code>; sets <code>is_active = FALSE</code> on universal_profiles and print_only_contacts (matching the standalone <code>ncoa.py</code> script). On <code>print_list_subscribers</code>, the comma-separated <code>subscribed_lists</code> is merged into <code>unsubscribed_lists</code> with <code>is_subscribed = FALSE</code> + <code>unsubscribe_reason</code>/<code>unsubscribe_date</code>. user_profiles keeps <code>is_active = TRUE</code> &mdash; print-undeliverable doesn&rsquo;t kill the email subscription.</li>
              <li><strong>Codes 30&ndash;38</strong> (legitimate moves with a new address): Address fields are updated, the previous values shift to <code>old_*</code> columns, and an <code>address_update</code> event is pushed into <code>address_history</code> with source <code>walsworth_ncoa</code> and the return code. The matched row updates directly; any other table holding the same NPI is updated via NPI cascade (source <code>walsworth_ncoa_cascade</code>).</li>
              <li><strong>Missing new address</strong> or <strong>old == new</strong>: Treated as undeliverable regardless of return code.</li>
              <li>Every write logs to <code>print_list_activity_log</code> with action <code>ncoa_address_update</code> or <code>ncoa_undeliverable</code>.</li>
            </ul>

            <h4>Endpoints</h4>
            <ul>
              <li><code>POST /api/list-management/ncoa/preview</code> &mdash; multipart CSV upload, returns <code>{`{address_updates, undeliverable, already_current, not_found, summary}`}</code>.</li>
              <li><code>POST /api/list-management/ncoa/apply</code> &mdash; JSON body with the user-selected entries from the preview, returns <code>{`{applied: {address_updates, undeliverable}, errors}`}</code>.</li>
              <li>The legacy <code>/api/print-lists/ncoa-upload</code> endpoint (in <code>print_lists.py</code>) is no longer used by the UI but is left in place. The active <code>/api/list-management/ncoa/*</code> path now writes to <code>print_list_subscribers</code> directly as well, so no functional gap remains.</li>
            </ul>

            <h4>CSV Schema (Walsworth)</h4>
            <p>
              Header row uses these column names: <code>Individual Name</code>, <code>Return Code</code>, <code>Previous Delivery Address</code>,
              <code>Previous Suite/Apartment</code>, <code>Previous City/State/ZIP+4</code>, <code>Current Delivery Address</code>,
              <code>Current Suite/Apartment</code>, <code>Current City/State/ZIP+4</code>. ZIP+4 is concatenated (e.g. <code>463858031</code>);
              the backend keeps only the first 5 digits when writing.
            </p>
          </div>

          <div className="docs-card">
            <h3>Shadow Engagers</h3>
            <p>
              Identifies users who likely have email image loading disabled. These users never trigger open-tracking pixels
              but prove they read emails by clicking links across multiple campaigns. Data is populated by running a local
              detection script that analyzes all campaign CSVs and writes results to the database.
            </p>
            <h4>How It Works</h4>
            <ul>
              <li>The detection script scans all campaign event CSVs from Azure Blob Storage (deployments merged by base campaign name).</li>
              <li>For each user, it tracks campaigns where they clicked but had zero opens, after filtering out bot clicks (IP-based, behavioral, and timing filters).</li>
              <li>A confidence score (0&ndash;100%) is calculated based on: ratio of no-open-click campaigns to total clicked campaigns, number of campaigns with clicks but no opens, total clean clicks, and penalty for campaigns where opens did fire.</li>
              <li>Classifications: <strong>Confirmed</strong> (&ge;75%), <strong>Likely</strong> (50&ndash;74%), <strong>Potential</strong> (30&ndash;49%), <strong>Unlikely</strong> (&lt;30%).</li>
            </ul>
            <p>Results table uses standard pagination (100 rows per page) with an &ldquo;Export CSV&rdquo; button at the top.</p>
          </div>

          <div className="docs-card">
            <h3>HCP Targeting</h3>
            <p>
              HCP-level targeting view powered by the <code>hcp_cluster_blob.json</code> dataset. Filter by disease state,
              content medium, or engagement category. Click any row to open the holistic profile modal.
            </p>
            <ul>
              <li>Standard pagination (100 rows per page) with an &ldquo;Export CSV&rdquo; button at the top of the table.</li>
              <li>Modal navigation arrows (or ← / → keys) step through the current page&rsquo;s rows; Esc closes.</li>
            </ul>

            <h4>HCP Profile Modal</h4>
            <p>
              Timeline-first holistic profile. On open, the modal calls <code>POST /api/users/profile-timeline</code> with the
              row&rsquo;s email and/or NPI and renders the user&rsquo;s entire history alongside engagement and current
              subscription state. Anonymous GA users skip the API call and show only the GA Match tab.
            </p>
            <ul>
              <li><strong>Header</strong> &mdash; name, Owned/Licensed source badge, Active/Inactive status, GA Match badge if applicable, prev/next position, close.</li>
              <li><strong>Counts strip</strong> &mdash; lists, tags, segments, target lists, sent, opens, clicks, bounces, unsubs &mdash; pulled from the profile-timeline response.</li>
              <li><strong>Timeline tab (default)</strong> &mdash; chronological event spine grouped by day. Filter chips: All / Engagement / List &amp; Tag / Target Lists / Bounces / Unsubs. Free-text search across event name, campaign, brand, agency, URL. Dot colors: cyan = engagement, violet = list/tag/segment movement, amber = bounce, red = unsub, magenta-ringed = target-list inclusion (agency-curated).</li>
              <li><strong>Current State tab</strong> &mdash; cards for Digital Lists, Tags, Segments, Target Lists, Print Lists, and Unsubscribed-from. Empty cards are hidden so print-only or digital-only users see only relevant sections.</li>
              <li><strong>Engagement tab</strong> &mdash; sent/opens/clicks/bounces stats with open and click-through rates; engagement-by-disease-state and topic-affinity bars; click categories.</li>
              <li><strong>Campaigns tab</strong> &mdash; per-campaign table with Brand, Agency, Type, Sent, Opens, Clicks. Rows where the user was on the agency-supplied target list get a magenta &ldquo;Target&rdquo; tag inline next to the campaign name.</li>
              <li><strong>GA Match tab (conditional)</strong> &mdash; only renders when the HCP has GA session data. Session list with expandable per-event detail; falls back to a probabilistic-match table when only candidate matches exist.</li>
            </ul>

            <h4>Backend &mdash; <code>POST /api/users/profile-timeline</code></h4>
            <p>
              Input: <code>{`{ email, npi }`}</code> (one or both). Looks up the user via <code>user_profiles</code>, then
              UNIONs membership history from <code>ac_membership_events</code> (lists / tags / segments / master; unsub events
              detected via the <code>[unsub] {`{name}`}</code> prefix) with engagement events from
              <code>campaign_interactions</code>. Joins <code>campaign_reporting_metadata</code> for brand /
              supplier / target-list metadata and a LATERAL pick of <code>brand_editor_agency</code> for the agency and
              pharma company per brand. Returns <code>profile</code>, <code>current_state</code>, <code>totals</code>,
              and a single chronological <code>timeline</code> array.
            </p>
          </div>

          <div className="docs-card">
            <h3>Print Lists / Digital Lists</h3>
            <p>
              Both list views render members in a server-paginated table (100 rows per page) using the standard pagination
              control. An &ldquo;Export CSV&rdquo; button sits at the top of the table. Print Lists splits across three tabs:
              Subscribed, Unsubscribed, and Blacklisted Addresses.
            </p>
            <p>
              <strong>Row click &mdash; HCP Profile Modal:</strong> Clicking any row in Digital Lists or Print Lists opens the
              same holistic profile modal as HCP Targeting (timeline-first, with Current State / Engagement / Campaigns / GA
              Match tabs). Print Lists action buttons (the &minus; unsubscribe and + resubscribe icons in edit mode) stop
              propagation so they do not trigger the profile modal. Modal prev/next steps through the current visible page;
              ← / → / Esc keys are supported.
            </p>
            <p>
              Print Lists &ldquo;In Audience&rdquo; column color-codes Yes by source: <span style={{ color: '#22c55e', fontWeight: 600 }}>green</span> for
              Owned and <span style={{ color: '#d9b87f', fontWeight: 600 }}>tan/yellow</span> for Licensed (IQVIA HCPs / HLD HCPs).
              Source is also included as a column in the CSV export.
            </p>

            <h4>Edit Mode (Print Lists only)</h4>
            <p>
              The header has an &ldquo;✎ Edit&rdquo; toggle on the left. By default the table is read-only &mdash; clicking the toggle
              arms editing and reveals a <code>+ Add</code> button next to the list dropdown plus a per-row action button
              (&minus; for subscribed rows, + for unsubscribed rows). Every destructive action still triggers a confirm modal,
              so editing is two layers of safety: arm the buttons, then confirm.
            </p>
            <ul>
              <li><strong>Add Subscriber:</strong> Modal with NPI/name/address/list-checkbox form. NPI or name+address blur triggers a lookup against <code>universal_profiles</code> &rarr; <code>user_profiles</code> &rarr; <code>print_only_contacts</code>; on a hit, the form pre-fills and a banner says which table the lists will be appended to. On submit, lists are appended to the matched record&rsquo;s <code>print_lists_subscribed</code> JSONB; with no match a new <code>print_only_contacts</code> row is inserted. Blacklisted addresses are blocked at this step.</li>
              <li><strong>Unsubscribe (− button):</strong> Modal that lets you pick which lists to remove and a multi-select reason (Moved, Retired, Deceased, Business closed, No longer at this address, Address undeliverable, Not interested, Switched specialties, plus a free-text Other). Reasons are joined with &ldquo;; &rdquo; into <code>unsubscribe_reason</code>. List names move from the row&rsquo;s <code>print_lists_subscribed</code> JSONB into <code>print_lists_unsubscribed</code> JSONB. If the chosen reason implies an address problem (Moved / Business closed / No longer at address / Address undeliverable), an &ldquo;Also blacklist this address&rdquo; checkbox appears; checking it cascades-unsubscribes everyone else at that address.</li>
              <li><strong>Resubscribe (+ button on Unsubscribed tab):</strong> Confirms via <code>window.confirm</code>, then moves the currently-selected list names back from <code>print_lists_unsubscribed</code> to <code>print_lists_subscribed</code>. Blocked if the address is currently blacklisted.</li>
              <li><strong>Edit Address (✎ button, edit mode):</strong> Opens a modal pre-filled with the row&rsquo;s address fields (address line 1/2, city, state, zip). On save, writes to the source table (<code>universal_profiles</code> practice + mailing, <code>user_profiles</code>, or <code>print_only_contacts</code>), appends the prior address to that row&rsquo;s <code>address_history</code> JSONB, and &mdash; if an NPI exists &mdash; cascades the same update across the other two tables (matching the NCOA upload propagation pattern). Logged to <code>print_list_activity_log</code> with action <code>manual_address_update</code>. Endpoint: <code>POST /api/list-management/print-lists/update-address</code>.</li>
              <li><strong>Add to Unsubscribed:</strong> The same Add modal has a Subscribe / Unsubscribe toggle at the top &mdash; switching to Unsubscribe mode lets you put someone directly on an unsubscribe list (e.g. a Hot Topics opt-out where the person was never &ldquo;subscribed&rdquo; to anything). Custom list names can be typed in (comma-separated) on top of the standard checkboxes.</li>
            </ul>

            <h4>Blacklisted Addresses Tab</h4>
            <p>
              Address-level rejection list. One row per blacklisted address with: address, city, state, zip, reason,
              affected-count (how many records currently sit in <code>print_lists_unsubscribed</code> at this address),
              and date added. Click the row caret to expand and see exactly which people were affected (table#id, name, NPI).
            </p>
            <ul>
              <li>In edit mode, a <code>+ Add Blacklist</code> button appears at the top of the tab and × delete buttons appear at the end of each row.</li>
              <li>Adding a blacklist entry runs a cascade across <code>universal_profiles</code>, <code>user_profiles</code>, and <code>print_only_contacts</code>: every active subscriber at that address has their <code>print_lists_subscribed</code> JSONB cleared and merged into <code>print_lists_unsubscribed</code> with the blacklist reason. The cascade is on by default in the modal but can be unchecked.</li>
              <li>Once blacklisted, future Add attempts at that address return a 409 with the blacklist reason &mdash; the Add modal surfaces this as an inline error and refuses to write.</li>
              <li>Deleting a blacklist entry only removes the future-block; previously cascaded unsubscribes stay unsubscribed.</li>
            </ul>

            <h4>Endpoints (under <code>/api/list-management/print-lists</code>)</h4>
            <ul>
              <li><code>POST /lookup</code> &mdash; pre-fill helper used by the Add modal; tries NPI then name+address across the three tables.</li>
              <li><code>POST /subscribe</code> &mdash; routes to UP / UP-by-name / user_profiles / print_only_contacts; appends JSONB; logs to <code>print_list_activity_log</code>.</li>
              <li><code>POST /unsubscribe</code> &mdash; moves lists from subscribed JSONB to unsubscribed JSONB; sets <code>unsubscribe_reason</code>; optional <code>also_blacklist</code> creates a blacklist entry and cascades.</li>
              <li><code>POST /resubscribe</code> &mdash; reverse of unsubscribe; blocked if address is blacklisted.</li>
              <li><code>GET /blacklist</code>, <code>POST /blacklist</code>, <code>DELETE /blacklist/:id</code>, <code>GET /blacklist/:id/affected</code>.</li>
            </ul>
            <p>
              Digital Lists shows a row of brand-total hero cards above the tabs &mdash; JCAD, NPPA, BT, Oncology, ICNS, NHR &mdash;
              counting only currently-active subscribers. Totals are computed from the <code>subscribed_counts</code> map on
              <code>/api/list-management/digital-lists/overview</code> by summing exact list names &mdash; no more, no less:
            </p>
            <ul>
              <li><strong>JCAD</strong> = JCAD US Subscribers + JCAD International Subscribers + JCAD NPPA (MMC) + JCAD Comp</li>
              <li><strong>NPPA</strong> = JCAD NPPA (MMC)</li>
              <li><strong>BT</strong> = BT US Subscribers + BT Comp</li>
              <li><strong>Oncology</strong> = Oncology (MMC)</li>
              <li><strong>ICNS</strong> = ICNS International Subscribers + ICNS US Subscribers</li>
              <li><strong>NHR</strong> = Nutrition Health Review</li>
            </ul>
            <p>
              NPPA overlaps with JCAD by design (it&rsquo;s a subset that&rsquo;s also called out on its own card).
            </p>

            <h4>Digital Lists &mdash; Edit Address</h4>
            <p>
              Digital Lists has its own <code>✎ Edit</code> mode toggle in the controls row (left of the contact count).
              When edit mode is on, every row in Audience / Lists / Tags / Segments gets an extra <code>✎</code> button at
              the far right. It opens the same modal as Print Lists and calls the same backend
              endpoint <code>POST /api/list-management/print-lists/update-address</code>. The source table for digital rows
              is always <code>user_profiles</code>; the cascade still hits <code>universal_profiles</code> and <code>print_only_contacts</code> if
              the row has an NPI, so a single address edit propagates everywhere. The four members endpoints
              (<code>/audience</code>, <code>/digital-lists/members</code>, <code>/tags/members</code>, <code>/segments/members</code>)
              now return <code>source_id</code>, <code>source_table</code>, <code>address</code>, and <code>zipcode</code> so the modal can pre-fill correctly.
            </p>
          </div>

          <div className="docs-card">
            <h3>Pagination &amp; Export Standard</h3>
            <p>
              All tables in Audience Analytics &mdash; Find Users, Analyze Users, NPI Lookup, Specialty Lookup, HCP Targeting,
              Print Lists, Digital Lists, and Shadow Engagers &mdash; use the same pagination component as Campaign Performance
              (Previous / numbered page buttons / Next, up to 5 page buttons visible) at <strong>100 rows per page</strong>
              with no rows-per-page selector. The &ldquo;Export CSV&rdquo; button is always anchored at the top-right of the
              table area. The DMA Breakdown and IQVIA List Efficiency Analysis tools are intentionally exempt from this
              standard.
            </p>
          </div>

          <div className="docs-card">
            <h3>Subscriber Intake</h3>
            <p>
              Onboarding pipeline for new subscribers from form exports. Accepts CSV uploads from four sources, cleans and
              normalizes the data, looks up matching records in <code>universal_profiles</code> and <code>user_profiles</code>,
              then splits the rows into editable buckets that map to specific Active Campaign lists. The Run button writes
              to <code>user_profiles.digital_lists_subscribed</code> (digital buckets) and <code>print_list_subscribers</code>
              (print buckets); it does not call ActiveCampaign directly &mdash; AC writes are deferred to a future layer.
            </p>

            <h4>Source Types (auto-detected from CSV headers; can be overridden)</h4>
            <ul>
              <li><strong>JCAD (WordPress):</strong> Gravity Forms export with four publication checkboxes (JCAD Print, JCAD Digital, NPPA Print, NPPA Digital) plus full address fields.</li>
              <li><strong>Oncology Matrix:</strong> Same address structure as JCAD with cancer-area columns (Breast, Multiple Myeloma, Lung, RCC, Melanoma, Prostate) and a content-format choice. Routes to a single bucket.</li>
              <li><strong>ICNS:</strong> Different column shape with split name (Prefix/First/Middle/Last/Suffix) and an explicit Type-of-Professional field. Includes self-reported Industry value.</li>
              <li><strong>Social Media (Phase 1):</strong> Minimal input (first, last, email, optional NPI, optional specialty). Common for Instagram and other social-media signups.</li>
            </ul>

            <h4>Data Cleaning (defensive: transform what we&rsquo;re confident about, flag the rest)</h4>
            <ul>
              <li><strong>Names:</strong> Strip <code>Dr</code>/<code>Dr.</code>/<code>Mr.</code>/<code>Mrs.</code> prefixes, drop trailing single-letter middle initials, smart title-case (handles Mc/Mac, hyphens, particles like de/van/von, all-caps and all-lowercase inputs).</li>
              <li><strong>Email:</strong> Lowercase + trim. Flag known typo domains (<code>gnail.com</code> → suggested <code>gmail.com</code>, etc.) without auto-fixing. Flag invalid format.</li>
              <li><strong>Degree:</strong> Strip parenthetical qualifications (<code>MBBS, MD (1st year)</code> → <code>MBBS, MD</code>), expand long forms (<code>Family Nurse Practitioner</code> → <code>FNP</code>, <code>Master&rsquo;s of Science in Nursing</code> → <code>MSN</code>), normalize separators (slashes and periods → commas per the JCAD video rule), uppercase known abbreviation tokens, flag tokens that don&rsquo;t match any known pattern.</li>
              <li><strong>State:</strong> Convert full names to two-letter codes for US (50 + DC + territories) and Canada (10 provinces + 3 territories). Drop state for non-Canada international per the JCAD video rule. Flag column-shift suspects (state field contains a country name).</li>
              <li><strong>Country:</strong> Normalize variants (<code>USA</code>/<code>U.S.</code>/<code>America</code> → <code>United States</code>; <code>UK</code>/<code>England</code> → <code>United Kingdom</code>). Compute <code>is_us</code> and <code>is_us_or_canada</code> flags.</li>
              <li><strong>Address:</strong> Detect UK split-number pattern (<code>addr1=&quot;40&quot;</code> + <code>addr2=&quot;Manscombe Road&quot;</code> → merge); dedupe identical addr1/addr2; split secondary designators (<code>Ste 207</code>/<code>Suite 300</code>/<code>Apt X</code>/<code>Unit Y</code>) out of addr1 into addr2; apply USPS suffix abbreviations (<code>Avenue</code> → <code>Ave</code>, <code>Road</code> → <code>Rd</code>, etc.); detect placeholder cities (<code>-</code>, <code>_</code>, <code>Select</code>); flag column-shift in city.</li>
              <li><strong>Zip:</strong> Validate 5-digit (or 5+4) for US; <code>A0A 0A0</code> for Canada (auto-format). Flag alphabetic zips as column-shift suspects.</li>
              <li><strong>NPI:</strong> Strip non-digits, validate 10-digit and starts-with-1, flag invalid format.</li>
              <li><strong>Specialty inference:</strong> When the source doesn&rsquo;t supply a specialty field, infer from degree + job title + type-of-professional (<code>Dermatology Resident</code>, <code>Esthetician</code>, <code>Student in a Healthcare Organization</code>, <code>Nurse Practitioner</code>, etc.). Flag if nothing can be inferred.</li>
            </ul>

            <h4>Match &amp; Enrichment (tiered)</h4>
            <ol>
              <li><strong>NPI given:</strong> Direct lookup in <code>universal_profiles</code> (confidence 1.0).</li>
              <li><strong>Email match:</strong> Found in <code>user_profiles</code> &mdash; pulls existing record plus <code>source_classification</code> (Owned/Licensed) via the shared <code>classify_source_sql_expr</code> helper (confidence 0.9, or 0.95 if email&rarr;NPI&rarr;universal succeeds).</li>
              <li><strong>Name + state:</strong> Filter <code>universal_profiles</code> by lowercased first/last with <code>primary_taxonomy_code LIKE &apos;207N%&apos;</code> (derm scope) and matching practice or mailing state. Single hit = confident (0.85), multiple = ambiguous, zero = fall back to non-derm scope (0.6 if single hit) or no match.</li>
              <li><strong>Industry detection:</strong> Compare company name and email-domain root against <code>brand_editor_agency.agency</code> / <code>pharma_company</code> / <code>brand</code> (all active rows). For ICNS, also accept self-reported <code>Type of professional = Industry</code>.</li>
            </ol>

            <h4>Bucket Routing (data-driven per source)</h4>
            <ul>
              <li><strong>Print buckets</strong> (write to <code>print_list_subscribers</code>): JCAD Print, JCAD NPPA Print, JCAD Comp Print.</li>
              <li><strong>Digital buckets</strong> (write to <code>user_profiles.digital_lists_subscribed</code>): JCAD US Subscribers, JCAD NPPA Digital, JCAD International Subscribers, JCAD Comp Digital, Oncology MMC, ICNS US, ICNS International.</li>
              <li><strong>Review-only buckets</strong> (no auto-write): Already Owned, Currently Licensed (flagged for future AC migration), Ambiguous Match (inline candidate picker), Cleaning Issues, No NPI / Non-HCP, Manual Review.</li>
            </ul>

            <h4>Source-Specific Routing Rules</h4>
            <ul>
              <li><strong>International (JCAD):</strong> Eligible only for JCAD International Subscribers (digital). Print and NPPA are skipped even if checked.</li>
              <li><strong>NPPA-over-JCAD (digital only):</strong> If a US NP/PA checks both JCAD Digital and NPPA Digital, route only to JCAD NPPA Digital (since every JCAD send includes NPPA recipients). Print is unaffected &mdash; checking both print boxes lands them on both lists.</li>
              <li><strong>Industry contacts (JCAD):</strong> Route to JCAD Comp Print and/or JCAD Comp Digital based on what they checked, regardless of the regular eligibility rules.</li>
              <li><strong>ICNS Industry override:</strong> Industry contacts (matched or self-reported) route to ICNS US with <code>specialty</code> overridden to <code>industry</code>, regardless of country.</li>
              <li><strong>Oncology Matrix:</strong> One bucket (<code>Oncology MMC</code>) for everyone. Cancer-area selections and content-format preference are preserved as row metadata for future use.</li>
              <li><strong>Already Owned:</strong> Email already in <code>user_profiles</code> with Owned classification &mdash; review-only bucket; user can choose to refresh address.</li>
              <li><strong>Currently Licensed:</strong> Email already in <code>user_profiles</code> with Licensed classification (IQVIA/HLD) &mdash; review-only bucket flagging the migration intent for the future AC-write layer.</li>
            </ul>

            <h4>UI</h4>
            <ul>
              <li>Drag-and-drop CSV upload with optional source-type override (auto-detection by default).</li>
              <li>Bucket tab strip across the top with count badges; click a tab to view that bucket&rsquo;s editable table.</li>
              <li>Each cell is editable inline. Cells the cleaner changed are highlighted yellow with a hover-tooltip showing the original value. Cells with flags are highlighted red with the flag message in the tooltip.</li>
              <li>Ambiguous rows show an inline candidate picker (matching universal_profiles records with NPI, name, specialty, city/state) &mdash; clicking a candidate fills the row.</li>
              <li>Per-bucket actions: <strong>Run</strong> (writes the bucket&rsquo;s rows to the appropriate backend table) and <strong>Export CSV</strong> (right-aligned per the project standard, downloads the edited values).</li>
              <li>Working state is persisted to <code>localStorage</code> so reloading the tab keeps the upload, edits, and candidate selections.</li>
            </ul>

            <h4>Backend</h4>
            <ul>
              <li><code>backend/subscriber_cleaner.py</code> &mdash; pure cleaning functions (no DB), per-field with diff and flag tracking.</li>
              <li><code>backend/subscriber_matcher.py</code> &mdash; batched lookup against <code>universal_profiles</code>, <code>user_profiles</code>, <code>print_list_subscribers</code>, and <code>brand_editor_agency</code>.</li>
              <li><code>backend/subscriber_router.py</code> &mdash; rule engine returning bucket assignments per source type.</li>
              <li><code>backend/routes/subscriber_intake.py</code> &mdash; <code>POST /api/subscriber-intake/process</code> (upload + clean + match + route), <code>POST /api/subscriber-intake/run-print</code>, <code>POST /api/subscriber-intake/run-digital</code>.</li>
            </ul>
          </div>
        </section>


        <section id="basis-performance" className="docs-section">
          <h2>8. Basis Performance</h2>

          <div className="docs-card">
            <h3>Overview</h3>
            <p>
              Basis Performance provides analytics for the Basis DSP (Demand-Side Platform) used for programmatic display advertising.
              It is organized into 6 sub-tabs: Overview, Bid, Exchange, Brand, Domain, and Recommendations.
              A timeframe control (All Time, Last Week/Month/3/6/12 Months, Custom Range) is available on all tabs except Overview and Recommendations.
            </p>
          </div>

          <div className="docs-card">
            <h3>Overview Tab</h3>
            <p>High-level performance dashboard with:</p>
            <ul>
              <li><strong>Summary Cards (6):</strong> Total Impressions, Total Clicks, Total Spend, Avg eCPM, Avg eCPC, Avg CTR.</li>
              <li><strong>Brand Table:</strong> Campaign-level metrics ranked by brand. Columns: Brand, Campaigns, Impressions, Clicks, Spend, eCPM, vs Avg eCPM %, CTR. Color-coded: Green (&lt; 0% vs avg = efficient), Red (&gt; 30% vs avg = expensive).</li>
              <li><strong>Volume Distribution:</strong> Top 8 exchanges as horizontal bars showing volume percentage and eCPM.</li>
              <li><strong>Best Value Exchanges:</strong> Top 3 exchanges with below-average eCPM and &ge; 2% volume.</li>
              <li><strong>Growth Opportunities:</strong> Top 5 exchanges with potential gain, using bid multiplier formula: <code>sqrt(targetWinRate / currentWinRate)</code>. Target: 70% win rate.</li>
              <li><strong>Cost Savings Opportunities:</strong> Top 5 exchanges with &gt; 90% win rate where bids can be lowered. Target: 75% win rate.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Exchange Scorecard Tab</h3>
            <p>
              Detailed exchange performance with columns: Exchange, Volume %, Impressions, Clicks, Win Rate %, Spend, eCPM,
              vs Avg %, Action status badge, and Insight text. Status badges: excellent, good, average, below_avg, poor.
              Filterable by search term.
            </p>
          </div>

          <div className="docs-card">
            <h3>Brand Analysis Tab</h3>
            <p>
              Campaign-level performance with columns: Campaign, Brand, Impressions, Clicks, CTR %, Spend, eCPM, eCPC,
              eCPM vs Avg %, eCPC vs Avg %. Variance coloring: &lt; 0% = positive (green), &gt; 30% = negative (red).
            </p>
          </div>

          <div className="docs-card">
            <h3>Bid Analysis Tab</h3>
            <p>Bid strategy analysis with dynamic strategy recommendations:</p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead><tr><th>Condition</th><th>Strategy</th></tr></thead>
                <tbody>
                  <tr><td>Win Rate &gt; 95%</td><td>Lower Bid</td></tr>
                  <tr><td>Win Rate &gt; 85%</td><td>Optimized</td></tr>
                  <tr><td>Win Rate &lt; 50% AND positive gain AND eCPM below avg</td><td>Raise Bid</td></tr>
                  <tr><td>Win Rate &lt; 50% AND positive gain</td><td>Test Raise</td></tr>
                  <tr><td>Win Rate &lt; 50%</td><td>Low Wins</td></tr>
                  <tr><td>eCPM vs Avg &lt; -15%</td><td>Efficient</td></tr>
                  <tr><td>eCPM vs Avg &gt; 30%</td><td>Expensive</td></tr>
                  <tr><td>Default</td><td>Maintain</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="docs-card">
            <h3>Domain Performance Tab</h3>
            <p>
              Property/domain-level metrics with columns: Domain/App, Status badge, Impressions, Clicks, Spend, eCPM,
              vs Avg %, CTR %, eCPC. Sortable headers with initial sort by impressions descending. Standard pagination
              (100 rows per page) with an &ldquo;Export CSV&rdquo; button at the top of the table.
            </p>
          </div>

          <div className="docs-card">
            <h3>Recommendations Tab</h3>
            <p>
              Displays system-generated optimization recommendations. Shows a pending count badge on the tab label.
            </p>
            <h4>Recommendation Types</h4>
            <ul>
              <li><code>set_exchange_bid_multiplier</code>: Adjust bid multiplier for specific exchange.</li>
              <li><code>add_to_blocklist</code>: Block underperforming domain.</li>
              <li><code>create_allowlist</code>: Create allowlist of top-performing domains.</li>
              <li><code>set_domain_bid_cap</code>: Cap bid for expensive domain.</li>
              <li><code>disable_exchange</code>: Disable underperforming exchange.</li>
              <li><code>set_frequency_cap</code>: Limit impression frequency.</li>
              <li><code>review_exchange_mix</code>: Review volume distribution.</li>
            </ul>
            <p>
              Each recommendation shows: priority indicator, title, category badge, estimated savings, potential impressions,
              description, current state, recommended action, relevant metrics, top domains (if applicable), and implementation instructions.
            </p>
            <p>When no recommendations exist, a "System Optimized" state displays with current portfolio metrics.</p>
          </div>
        </section>


        <section id="content-performance" className="docs-section">
          <h2>9. Content Performance</h2>

          <div className="docs-card">
            <h3>Overview</h3>
            <p>
              Content Performance aggregates metrics from multiple content platforms: Walsworth (digital journals),
              Google Analytics, YouTube, Vimeo, LinkedIn, Facebook, and Instagram. Each platform has its own sub-tab.
            </p>
          </div>

          <div className="docs-card">
            <h3>Data Freshness &mdash; Last Synced &amp; Data Through</h3>
            <p>
              Every platform table in Content Performance displays two standardized date indicators to provide full
              transparency about data freshness:
            </p>
            <ul>
              <li><strong>Last synced:</strong> When the data was last fetched from the external platform. Displayed as a relative time
                (e.g., &ldquo;Today,&rdquo; &ldquo;Yesterday,&rdquo; &ldquo;3 days ago&rdquo;). If the sync date is not explicitly
                stored, it is inferred as one day after the &ldquo;data through&rdquo; date.</li>
              <li><strong>Data through:</strong> The most recent date the data covers. Displayed as a formatted date
                (e.g., &ldquo;Mar 5, 2026&rdquo;). This clarifies that while the sync may have happened today, the data
                itself is current through this specific date.</li>
            </ul>
            <p>
              This pattern is consistent across all platform tabs (Social Metrics, Video Metrics, Digital Journals) and matches
              the same convention used in Basis Performance, ensuring standardization across the application.
            </p>
          </div>

          <div className="docs-card">
            <h3>Impressions Standardization Across Platforms</h3>
            <p>
              To maintain a consistent &ldquo;people seeing the content&rdquo; metric across all social platforms, the following
              source fields are mapped to a unified <strong>&ldquo;Impressions&rdquo;</strong> column in the table:
            </p>
            <div className="docs-table-wrapper">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Source Field</th>
                    <th>Displayed As</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>LinkedIn</td>
                    <td><code>impressions</code></td>
                    <td>Impressions</td>
                  </tr>
                  <tr>
                    <td>Facebook</td>
                    <td><code>views</code> (renamed)</td>
                    <td>Impressions</td>
                  </tr>
                  <tr>
                    <td>Instagram</td>
                    <td><code>impressions</code></td>
                    <td>Impressions</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              This ensures that regardless of what each platform natively calls its visibility metric, the dashboard presents
              a single, comparable &ldquo;Impressions&rdquo; column across LinkedIn, Facebook, and Instagram.
            </p>
          </div>

          <div className="docs-card">
            <h3>Walsworth / Google Analytics (Digital Journals)</h3>
            <p>Displays journal and publication metrics with toggle between Walsworth and Google Analytics data sources.</p>
            <h4>Walsworth Metrics (Summary Cards)</h4>
            <ul>
              <li>Total Page Views</li>
              <li>Unique Page Views</li>
              <li>Total Issue Visits</li>
              <li>Avg Time in Issue</li>
            </ul>
            <h4>Google Analytics Metrics (Summary Cards)</h4>
            <ul>
              <li>Total Users</li>
              <li>Avg Duration</li>
              <li>Bounce Rate</li>
              <li>Mobile:Desktop Ratio</li>
            </ul>
            <h4>Features</h4>
            <ul>
              <li>View modes: All Issues / By Publication (Walsworth) or All URLs / By Property (Google Analytics).</li>
              <li>Group by Page toggle (Google Analytics only) — aggregates URLs by page title.</li>
              <li>Publication/property filter chips with counts and Clear All.</li>
              <li>Searchable and sortable table with configurable rows per page (10–100) and pagination.</li>
              <li>CSV export (Google Analytics only).</li>
              <li>Last synced timestamp with relative date display.</li>
            </ul>
            <h4>Detail Modal</h4>
            <p>
              Clicking a row opens a detail modal with prev/next navigation (arrow keys supported) and timeframe filtering.
            </p>
            <ul>
              <li><strong>Walsworth Modal:</strong> Metric cards (Page Views, Unique Views, Visits, Avg Time), daily history table, and dual-axis line chart (Page Views vs Visits). Timeframe options: All Time, Last 7 Days, Last 14 Days.</li>
              <li><strong>Google Analytics Modal:</strong> Five tabs — Overview (metric cards, history table, dual-axis line chart for Users vs Avg Duration), Traffic Sources, Geography (countries and cities), Demographics (age and gender), and Technology (devices, browsers, OS). Timeframe options: All Time, Last 12/6/3 Months, Last Month.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>YouTube / Vimeo (Video Metrics)</h3>
            <p>Video performance metrics with platform toggle.</p>
            <h4>Summary Metrics</h4>
            <ul>
              <li>Total Views, Avg % Watched, Total Watch Time (both platforms).</li>
              <li>Total Impressions (Vimeo only).</li>
            </ul>
            <h4>YouTube Features</h4>
            <ul>
              <li>View modes: All Videos (merged by normalized title), By Channel, By Playlist.</li>
              <li>Channel multi-select with color-coded toggle chips per brand.</li>
              <li>Playlist multi-select when in By Playlist mode.</li>
              <li>Table columns: Title, Channel, Playlist, Date, Views, Avg % Watched, Total Watch Time.</li>
            </ul>
            <h4>Vimeo Features</h4>
            <ul>
              <li>Table columns: Title, Date, Views, Impressions, CTR, Avg % Watched, Total Watch Time.</li>
            </ul>
            <h4>Common Features</h4>
            <ul>
              <li>Searchable and sortable table with configurable rows per page (10–50) and pagination.</li>
              <li>CSV export.</li>
              <li>Watch time formatted contextually: days (&ldquo;1d 2h&rdquo;), hours (&ldquo;2h 30m&rdquo;), minutes (&ldquo;30m 15s&rdquo;), or seconds (&ldquo;45s&rdquo;).</li>
              <li>Last synced timestamp with relative date display.</li>
            </ul>
            <h4>Video Detail Modal</h4>
            <p>
              Clicking a video opens a detail modal with prev/next navigation (arrow keys supported), thumbnail preview,
              duration badge, published date, source badge, direct video link, and tags.
            </p>
            <ul>
              <li><strong>Engagement stats (YouTube):</strong> Likes, Comments, Shares, Net Subscribers.</li>
              <li><strong>Metric cards:</strong> Views, Avg % Watched, Total Time Watched (plus Impressions and Impressions CTR for Vimeo).</li>
              <li><strong>Timeframe options:</strong> Last 24 Hours, 7/14/30 Days, 3/6 Months, 1/2 Years, All Time, and Custom date range.</li>
              <li><strong>Overview tab:</strong> Views over time line chart (auto-aggregates daily/weekly/monthly based on range), daily performance table.</li>
              <li><strong>Traffic Sources tab (YouTube):</strong> Traffic source breakdown, playback locations, top external URLs, top search terms.</li>
              <li><strong>Geography tab (YouTube):</strong> Top countries, US states, and cities by views.</li>
              <li><strong>Audience tab (YouTube):</strong> Device breakdown, operating systems, subscription status, sharing services.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>LinkedIn / Facebook / Instagram (Social Metrics)</h3>
            <p>Social media performance metrics with platform toggle.</p>
            <h4>Metrics per Post</h4>
            <ul>
              <li>Impressions, Engagement (likes, comments, shares), Engagement Rate %, Click-Through Rate, Reach, Profile Visits.</li>
            </ul>
            <h4>Features</h4>
            <ul>
              <li>Content mode toggle: Posts, Stories, Reels (platform-dependent).</li>
              <li>View modes: All Content, By Channel, By Hashtag.</li>
              <li>Channel selector with post counts.</li>
              <li>Sortable, paginated post table.</li>
              <li>Post detail modal with engagement breakdown and charts.</li>
              <li>CSV export.</li>
            </ul>
          </div>
        </section>


        <section id="content-analytics" className="docs-section">
          <h2>10. Content Analytics</h2>

          <div className="docs-card">
            <h3>Overview</h3>
            <p>
              Content Analytics provides analytical tools for publication and content performance data.
              It follows the standard app layout: main header with search bar, four primary tabs, a sub-header showing the active tab name,
              and sub-tabs within each tab for different views.
            </p>
            <p>
              Primary tabs: <strong>Walsworth</strong>, <strong>Google Analytics</strong>, <strong>YouTube</strong>, <strong>Social Profiles</strong>.
              Each tab has its own set of sub-tabs (no sub-sub-tabs).
            </p>
          </div>

          <div className="docs-card">
            <h3>Walsworth Tab</h3>
            <p>Sub-header: "Walsworth". Three sub-tabs:</p>
            <h4>Publications Sub-tab</h4>
            <p>
              Compares metrics across selected publications with a section-header-bar containing Metrics and Publications dropdowns.
              Supports a "Per Issue" toggle that normalizes metrics by dividing by issue count. Two view modes:
            </p>
            <ul>
              <li><strong>Comparison:</strong> Bar chart and sortable data table showing metrics side-by-side across publications.</li>
              <li><strong>Trends:</strong> Line chart with one line per publication plotted over issue sequence. Delta callout cards display the latest value versus the publication average.</li>
            </ul>
            <h4>Journal Sub-tab</h4>
            <p>Placeholder for future journal content.</p>
            <h4>Anomaly Detection Sub-tab</h4>
            <p>
              Identifies issues whose performance significantly deviates from their publication's average using Z-Score analysis.
              Uses the same section-header-bar style as Campaign Analytics anomaly detection:
            </p>
            <ul>
              <li>Title has clickable Over/Under toggle (click to switch between overperforming and underperforming).</li>
              <li>"Analyze by" controls (Time, Visits, Page Views) appear in the header stats area.</li>
              <li>Threshold: |Z-Score| &gt; 1.5.</li>
              <li>Displays: severity, publication, issue name, metric value, publication mean, deviation %, Z-Score.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Google Analytics Tab</h3>
            <p>Sub-header: "Google Analytics". Four sub-tabs, each with its own section-header-bar and view mode toggles:</p>
            <ul>
              <li><strong>Device Insights:</strong> Device type breakdown (Desktop, Mobile, Tablet). Toggle: Overview / By Journal.</li>
              <li><strong>Traffic Sources:</strong> Traffic source analysis (Direct, Organic, Referral, Paid). Toggle: Overview / Source drilldown.</li>
              <li><strong>Geographic:</strong> Geographic traffic breakdown. Toggle: Overview / Country / City.</li>
              <li><strong>Demographics:</strong> Age and gender breakdown. Toggle: Overview / Age / Gender.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>YouTube Tab</h3>
            <p>Sub-header: "YouTube". Three sub-tabs:</p>
            <ul>
              <li><strong>Overview:</strong> Traffic sources, device distribution, and playback location charts.</li>
              <li><strong>Traffic Sources:</strong> Expandable matrix of traffic sources with per-video drilldown.</li>
              <li><strong>Audience:</strong> Age group, gender, subscription status, search terms, and external referral URLs.</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Social Profiles Tab</h3>
            <p>Sub-header: "Social Profiles". Five sub-tabs:</p>
            <ul>
              <li><strong>Followers:</strong> Grand total follower count across all platforms, with per-platform cards showing channel-level breakdowns with progress bars.</li>
              <li><strong>Growth:</strong> Line chart of follower growth over the last 90 days. Toggle between LinkedIn and Facebook. Insight cards for organic/paid gain and avg daily growth.</li>
              <li><strong>Page Views:</strong> Line chart of page view trends over the last 90 days. Toggle between LinkedIn and Facebook.</li>
              <li><strong>LinkedIn Demographics:</strong> Audience breakdown by job function, seniority, industry, and country. Channel selector when multiple channels exist.</li>
              <li><strong>Instagram Audience:</strong> Audience breakdown by city, country, age, and gender. Channel selector when multiple channels exist.</li>
            </ul>
          </div>
        </section>


        <section id="cmi-contracts" className="docs-section">
          <h2>11. CMI Contracts</h2>

          <div className="docs-card">
            <h3>Overview</h3>
            <p>
              The CMI Contracts page manages Contract Management Information records for media placement tracking.
              It provides an editable table of contract details organized by year.
            </p>
          </div>

          <div className="docs-card">
            <h3>Year Tabs</h3>
            <p>
              Three year tabs are available: 2024, 2025, 2026 (default: 2026). Switching years resets all filters,
              sorts, and row tracking. Data is fetched per year from the API.
            </p>
          </div>

          <div className="docs-card">
            <h3>Table Columns (12 Editable)</h3>
            <ul>
              <li>Contract Number</li>
              <li>Client</li>
              <li>Brand</li>
              <li>Vehicle</li>
              <li>Placement ID</li>
              <li>Placement Description</li>
              <li>Buy Component Type</li>
              <li>Media Tactic ID</li>
              <li>Frequency</li>
              <li>Metric</li>
              <li>Data Type</li>
              <li>Notes</li>
              <li>Actions (Delete button)</li>
            </ul>
          </div>

          <div className="docs-card">
            <h3>Inline Editing</h3>
            <p>
              Click any cell to enter edit mode. Press Enter to save, Escape to cancel. Arrow keys (Up/Down/Left/Right)
              navigate between cells. Changes are saved immediately via API.
            </p>
          </div>

          <div className="docs-card">
            <h3>Operations</h3>
            <ul>
              <li><strong>Add Row:</strong> Creates a new contract with auto-incrementing brand placeholder ("aa1", "aa2", ...) and timestamped placement ID. New rows appear at the top.</li>
              <li><strong>Delete Row:</strong> Permanently removes the contract record.</li>
              <li><strong>Sort:</strong> Click any column header. First click = ascending, second = descending. Default: Brand ascending. New rows remain pinned to the top regardless of sort.</li>
              <li><strong>Search:</strong> Full-text search across all fields, filtering in real-time.</li>
              <li><strong>Export:</strong> Downloads all contracts for the selected year as a CSV file.</li>
            </ul>
          </div>
        </section>


        <section id="brand-management" className="docs-section">
          <h2>12. Brand Management</h2>

          <div className="docs-card">
            <h3>Overview</h3>
            <p>
              Brand Management maintains a directory of brands organized by sales team member. It maps brands to their
              agencies, pharmaceutical companies, and market categories.
            </p>
          </div>

          <div className="docs-card">
            <h3>Organization</h3>
            <p>
              Brands are grouped under 4 sales team members (Emily, Courtney, Dana, Quinn) plus an "Unassigned" section
              for brands without a sales member or marked inactive.
            </p>
          </div>

          <div className="docs-card">
            <h3>Editable Fields (4 Columns)</h3>
            <ul>
              <li><strong>Brand:</strong> The brand/product name.</li>
              <li><strong>Agency:</strong> The associated agency.</li>
              <li><strong>Pharma Company:</strong> The parent pharmaceutical company.</li>
              <li><strong>Market:</strong> The market category.</li>
            </ul>
            <p>
              Inline editing works identically to CMI Contracts: click to edit, Enter to save, Escape to cancel,
              arrow keys for navigation.
            </p>
          </div>

          <div className="docs-card">
            <h3>Operations</h3>
            <ul>
              <li><strong>Add Brand:</strong> Per-member button creates a new entry with auto-incrementing placeholder name. New entries appear at the top of their section.</li>
              <li><strong>Move Brand:</strong> Dropdown to reassign a brand to a different sales member or to "Unassigned".</li>
              <li><strong>Delete:</strong> Permanently removes the brand entry.</li>
              <li><strong>Search:</strong> Full-text search across brand, agency, pharma_company, and market fields.</li>
            </ul>
          </div>
        </section>

        <div className="docs-footer">
          <p>
            This document is maintained as a living reference. For questions or discrepancies, consult Andrew.
          </p>
          <p className="docs-footer-version">
            Matrix Medical Communications &mdash; Campaign Analytics Platform Documentation v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentationPage;