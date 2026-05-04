


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."refresh_weekly_snapshots"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_week_start DATE := date_trunc('week', NOW())::date;
BEGIN
    INSERT INTO weekly_snapshots (
        company_id, week_start, signal_count, avg_intent_score, dominant_family
    )
    SELECT
        js.company_id,
        v_week_start,
        COUNT(*)                                        AS signal_count,
        ROUND(AVG(js.intent_score)::numeric, 2)        AS avg_intent_score,
        MODE() WITHIN GROUP (ORDER BY js.job_family)   AS dominant_family
    FROM job_signals js
    WHERE js.company_id IS NOT NULL
      AND js.created_at >= v_week_start
      AND js.created_at < v_week_start + INTERVAL '7 days'
    GROUP BY js.company_id
    ON CONFLICT (company_id, week_start)
    DO UPDATE SET
        signal_count     = EXCLUDED.signal_count,
        avg_intent_score = EXCLUDED.avg_intent_score,
        dominant_family  = EXCLUDED.dominant_family;
END;
$$;


ALTER FUNCTION "public"."refresh_weekly_snapshots"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "domain" "text",
    "industry" "text",
    "employee_range" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_signals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "external_job_id" "text" NOT NULL,
    "company_id" "uuid",
    "company_name" "text" NOT NULL,
    "job_title" "text" NOT NULL,
    "raw_description" "text",
    "job_url" "text",
    "job_family" "text",
    "intent_score" integer,
    "sales_hook" "text",
    "is_hot_lead" boolean DEFAULT false,
    "posted_at" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "score_components" "jsonb",
    CONSTRAINT "job_signals_intent_score_check" CHECK ((("intent_score" >= 1) AND ("intent_score" <= 10))),
    CONSTRAINT "job_signals_job_family_check" CHECK (("job_family" = ANY (ARRAY['Finance'::"text", 'Infrastructure'::"text", 'Security'::"text", 'Sales'::"text", 'Operations'::"text", 'Other'::"text"])))
);


ALTER TABLE "public"."job_signals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signal_tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "signal_id" "uuid" NOT NULL,
    "tag" "text" NOT NULL
);


ALTER TABLE "public"."signal_tags" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."signals_with_tags" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"text" AS "external_job_id",
    NULL::"uuid" AS "company_id",
    NULL::"text" AS "company_name",
    NULL::"text" AS "job_title",
    NULL::"text" AS "raw_description",
    NULL::"text" AS "job_url",
    NULL::"text" AS "job_family",
    NULL::integer AS "intent_score",
    NULL::"text" AS "sales_hook",
    NULL::boolean AS "is_hot_lead",
    NULL::"text" AS "posted_at",
    NULL::timestamp with time zone AS "created_at",
    NULL::"jsonb" AS "score_components",
    NULL::"text"[] AS "tech_stack";


ALTER VIEW "public"."signals_with_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_snapshots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "week_start" "date" NOT NULL,
    "signal_count" integer DEFAULT 0,
    "avg_intent_score" numeric(4,2),
    "dominant_family" "text"
);


ALTER TABLE "public"."weekly_snapshots" OWNER TO "postgres";


ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_signals"
    ADD CONSTRAINT "job_signals_external_job_id_key" UNIQUE ("external_job_id");



ALTER TABLE ONLY "public"."job_signals"
    ADD CONSTRAINT "job_signals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signal_tags"
    ADD CONSTRAINT "signal_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signal_tags"
    ADD CONSTRAINT "signal_tags_signal_id_tag_key" UNIQUE ("signal_id", "tag");



ALTER TABLE ONLY "public"."weekly_snapshots"
    ADD CONSTRAINT "weekly_snapshots_company_id_week_start_key" UNIQUE ("company_id", "week_start");



ALTER TABLE ONLY "public"."weekly_snapshots"
    ADD CONSTRAINT "weekly_snapshots_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE VIEW "public"."signals_with_tags" WITH ("security_invoker"='true') AS
 SELECT "js"."id",
    "js"."external_job_id",
    "js"."company_id",
    "js"."company_name",
    "js"."job_title",
    "js"."raw_description",
    "js"."job_url",
    "js"."job_family",
    "js"."intent_score",
    "js"."sales_hook",
    "js"."is_hot_lead",
    "js"."posted_at",
    "js"."created_at",
    "js"."score_components",
    COALESCE("array_agg"("st"."tag" ORDER BY "st"."tag") FILTER (WHERE ("st"."tag" IS NOT NULL)), '{}'::"text"[]) AS "tech_stack"
   FROM ("public"."job_signals" "js"
     LEFT JOIN "public"."signal_tags" "st" ON (("st"."signal_id" = "js"."id")))
  GROUP BY "js"."id";



ALTER TABLE ONLY "public"."job_signals"
    ADD CONSTRAINT "job_signals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."signal_tags"
    ADD CONSTRAINT "signal_tags_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "public"."job_signals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_snapshots"
    ADD CONSTRAINT "weekly_snapshots_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



CREATE POLICY "Public read access" ON "public"."companies" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."job_signals" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."signal_tags" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."weekly_snapshots" FOR SELECT USING (true);



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_signals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."signal_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weekly_snapshots" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_weekly_snapshots"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_weekly_snapshots"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_weekly_snapshots"() TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."job_signals" TO "anon";
GRANT ALL ON TABLE "public"."job_signals" TO "authenticated";
GRANT ALL ON TABLE "public"."job_signals" TO "service_role";



GRANT ALL ON TABLE "public"."signal_tags" TO "anon";
GRANT ALL ON TABLE "public"."signal_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."signal_tags" TO "service_role";



GRANT ALL ON TABLE "public"."signals_with_tags" TO "anon";
GRANT ALL ON TABLE "public"."signals_with_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."signals_with_tags" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."weekly_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_snapshots" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







