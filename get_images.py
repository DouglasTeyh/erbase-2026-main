from duckduckgo_search import DDGS
ddgs = DDGS()
queries = ["Sebrae logo branca png", "Secti Alagoas logo branca png", "Prefeitura de Maragogi logo branca png"]
for q in queries:
    try:
        results = ddgs.images(q, max_results=1)
        for r in results:
            print(f"{q}: {r['image']}")
    except Exception as e:
        print(f"{q} error: {e}")
