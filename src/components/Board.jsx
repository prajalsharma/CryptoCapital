import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { EcosystemDropdown } from "./EcosystemDropdown";
import GrantCard from "./GrantCard";
import { StatusDropdown } from "./StatusDropdown";
import { FundingTopicsDropdown } from "./FundingTopicsDropdown";
import { FundingTypeDropdown } from "./FundingTypeDropdown";
import { Button } from "./ui/button";

const API_KEY = import.meta.env.VITE_API_KEY;
const SHEET_ID = import.meta.env.VITE_SHEET_ID;
const RANGE = import.meta.env.VITE_RANGE;

const Board = () => {
  const [selectedEcosystems, setSelectedEcosystems] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedFundingTopics, setSelectedFundingTopics] = useState([]);
  const [selectedFundingTypes, setSelectedFundingTypes] = useState([]);
  const [selectedSortBy, setSelectedSortBy] = useState([]);
  const [grantPrograms, setGrantPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchGrants = async () => {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();

      if (data.values && data.values.length > 1) {
        const headers = data.values[0];
        const formattedData = data.values.slice(1).map((row) => {
          const grant = headers.reduce((acc, header, index) => {
            acc[header] = row[index] || "";
            return acc;
          }, {});

          return {
            ...grant,
            id: crypto.randomUUID(),

            // constructed new fields in the object for search purposes
            searchFundingTopics: grant.fundingTopics
              ? grant.fundingTopics.toLowerCase().replace(/\s+/g, "").split(",")
              : [],

            searchFundingType: grant.fundingType
              ? grant.fundingType.toLowerCase().replace(/\s+/g, "")
              : "",
          };
        });

        setGrantPrograms(formattedData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGrants();
  }, []);

  const filteredAndSortedGrants = React.useMemo(() => {
    let filtered = grantPrograms.filter((grant) => {
      return (
        (selectedEcosystems.length === 0 ||
          selectedEcosystems.includes(grant.ecosystem)) &&
        (selectedStatuses.length === 0 ||
          selectedStatuses.includes(grant.status)) &&
        (selectedFundingTopics.length === 0 ||
          grant.searchFundingTopics.some((topic) =>
            selectedFundingTopics
              .map((t) => t.toLowerCase().replace(/\s+/g, ""))
              .includes(topic)
          )) &&
        (selectedFundingTypes.length === 0 ||
          selectedFundingTypes
            .map((t) => t.toLowerCase().replace(/\s+/g, ""))
            .includes(grant.searchFundingType)) &&
        (!searchQuery ||
          [
            grant.grantProgramName,
            grant.description,
            grant.topicsForFunding,
            grant.fundingTopics,
            grant.fundingType,
          ]
            .filter(Boolean) // filters undefined/null values
            .some(
              (field) =>
                field.toLowerCase().includes(searchQuery.toLowerCase()) ||
                // for variation searching
                new RegExp(`\\b${searchQuery}`, "i").test(field)
            ))
      );
    });

    if (selectedSortBy.includes("mostRecent")) {
      filtered = [...filtered].sort((a, b) => {
        const dateA = a.date ? new Date(a.date + "-01") : new Date(0);
        const dateB = b.date ? new Date(b.date + "-01") : new Date(0);
        return dateB - dateA;
      });
    }

    // highest first
    if (selectedSortBy.includes("funding")) {
      filtered = [...filtered].sort((a, b) => {
        const totalA = a.total ? Number(a.total.replace(/[$,]/g, "")) : 0;

        const totalB = b.total ? Number(b.total.replace(/[$,]/g, "")) : 0;

        return totalB - totalA;
      });
    }

    return filtered;
  }, [
    grantPrograms,
    selectedEcosystems,
    selectedStatuses,
    selectedFundingTopics,
    selectedFundingTypes,
    selectedSortBy,
    searchQuery,
  ]);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <div className="my-5 flex flex-col gap-4 p-5 rounded-lg justify-center backdrop-blur bg-white/5">
        <Input
          placeholder="Search Grants..."
          className="bg-[#151226]/50 border-[#151226] text-gray-400"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="flex flex-col gap-4 md:flex-row">
          <EcosystemDropdown onChange={setSelectedEcosystems} />
          <StatusDropdown onChange={setSelectedStatuses} />
          <FundingTopicsDropdown onChange={setSelectedFundingTopics} />
          <FundingTypeDropdown onChange={setSelectedFundingTypes} />
        </div>

        <div className="ml-2 flex gap-3 items-center flex-wrap">
          <h3 className="font-semibold text-white">Sort By:</h3>
          {["mostRecent", "funding"].map((criteria) => (
            <Button
              key={criteria}
              className={`h-auto bg-[#151226]/70 text-white hover:bg-[#151226] ${
                selectedSortBy.includes(criteria) &&
                "bg-[#00bbfc] hover:bg-[#00bbfc]/50"
              }`}
              onClick={() =>
                setSelectedSortBy((prev) => {
                  if (prev.includes(criteria)) {
                    return prev.filter((item) => item !== criteria);
                  }

                  return [...prev, criteria];
                })
              }
            >
              {criteria === "mostRecent" ? "Most Recent" : "Funding"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center">Loading...</div>
        ) : (
          filteredAndSortedGrants.map((grant) => (
            <GrantCard key={grant.id} grant={grant} />
          ))
        )}
      </div>
    </div>
  );
};

export default Board;
